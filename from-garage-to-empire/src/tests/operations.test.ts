import { describe, expect, it } from 'vitest';
import { operations, operationBalance, type OperationId } from '../config/operations';
import { newGame, v4StateSchema } from '../core/state';
import {
  advanceOperations,
  automateOperation,
  canLaunchOperation,
  investmentQuote,
  investOperation,
  operationMultiplier,
  operationPayout,
  operationRevenue,
  startOperation,
} from '../core/operations';
import { dismiss, recordMissionProfit, resume, revenue, tick } from '../core/economy';
import { claimMission } from '../core/missions';
import { LocalSaveService, migrate, SAVE_KEY, BACKUP_KEY } from '../storage/save';
import { renderOperations } from '../ui/operations';
import { renderMissions } from '../ui/missions';
import { createGameSdk } from '../sdk';

function established() {
  const s = newGame(1000);
  s.money = 1e12;
  s.office = 2;
  s.reputation = 1000;
  s.contractHistory = { landing: 5, restaurant: 3, shop: 3, app: 15 };
  s.completed = 26;
  s.employees = [
    { id: 1, level: 10 },
    { id: 2, level: 10 },
  ];
  return s;
}

describe('parallel operations', () => {
  it('requires deliveries, offices and qualified developers even with enough money', () => {
    const s = newGame();
    s.money = 1e12;
    expect(investOperation(s, 'sites')).toBe(false);
    s.contractHistory.landing = 5;
    s.completed = 5;
    expect(investOperation(s, 'sites')).toBe(true);
    s.contractHistory.restaurant = 3;
    expect(investOperation(s, 'menus')).toBe(false);
    s.office = 1;
    expect(investOperation(s, 'menus')).toBe(true);
    s.office = 2;
    s.contractHistory.app = 15;
    s.employees = [
      { id: 1, level: 9 },
      { id: 2, level: 9 },
    ];
    expect(investOperation(s, 'apps')).toBe(false);
    s.employees[0]!.level = 10;
    expect(investOperation(s, 'apps')).toBe(true);
    expect(investOperation(s, 'saas')).toBe(false);
    s.employees[1]!.level = 10;
    expect(investOperation(s, 'saas')).toBe(false);
    s.operations.sites.level = 100;
    expect(investOperation(s, 'saas')).toBe(true);
  });

  it('rejects impossible purchases and double automation without charging money', () => {
    const s = established();
    expect(startOperation(s, 'sites')).toBe(false);
    expect(automateOperation(s, 'sites')).toBe(false);
    s.money = 2499;
    const before = structuredClone(s);
    expect(investOperation(s, 'sites')).toBe(false);
    expect(investOperation(s, 'invalid' as OperationId)).toBe(false);
    expect(s).toEqual(before);
    s.money = 10500;
    expect(investOperation(s, 'sites')).toBe(true);
    expect(automateOperation(s, 'sites')).toBe(true);
    expect(s.money).toBe(0);
    expect(automateOperation(s, 'sites')).toBe(false);
    expect(s.money).toBe(0);
  });

  it('charges identical rounded prices for bulk and individual investments and respects caps', () => {
    const a = established(),
      b = structuredClone(a);
    expect(investOperation(a, 'sites', 10)).toBe(true);
    for (let n = 0; n < 10; n++) investOperation(b, 'sites');
    expect(a).toEqual(b);
    expect(a.operations.sites.level).toBe(10);
    expect(investmentQuote(a, 'sites', 'milestone').levels).toBe(15);
    expect(operationMultiplier(9)).toBe(1);
    expect(operationMultiplier(10)).toBe(2);
    expect(operationPayout('sites', 25)).toBe(4500);
    a.operations.sites.level = 98;
    expect(investmentQuote(a, 'sites', 10).levels).toBe(2);
    expect(investOperation(a, 'sites', 10)).toBe(true);
    const last = structuredClone(a);
    expect(investOperation(a, 'sites', 'milestone')).toBe(false);
    expect(a).toEqual(last);
    expect(operationMultiplier(operationBalance.maxLevel)).toBe(32);
  });

  it('finishes a manual cycle only once offline and never creates contract progress', () => {
    const s = established();
    s.employees = [];
    investOperation(s, 'sites');
    startOperation(s, 'sites');
    expect(startOperation(s, 'sites')).toBe(false);
    const before = structuredClone(s);
    resume(s, s.savedAt + 86400000);
    expect(s.operations.sites.cycles).toBe(1);
    expect(s.operations.sites.earned).toBe(45);
    expect(s.operations.sites.running).toBe(false);
    expect(s.operations.sites.progress).toBe(0);
    expect(s.contractHistory).toEqual(before.contractHistory);
    expect(s.xp).toBe(before.xp);
    expect(s.reputation).toBe(before.reputation);
    expect(s.pendingOffline?.operationEarned).toBe(45);
    expect(operationRevenue(s)).toBe(0);
  });

  it('keeps the original cycle payout through upgrades and automation', () => {
    const s = established();
    investOperation(s, 'sites');
    startOperation(s, 'sites');
    advanceOperations(s, 14);
    investOperation(s, 'sites', 'milestone');
    automateOperation(s, 'sites');
    expect(advanceOperations(s, 1)).toBe(45);
    expect(s.operations.sites.cyclePayout).toBe(900);
    expect(advanceOperations(s, 30)).toBe(1800);
    expect(s.operations.sites.cycles).toBe(3);
  });

  it('settles every operation in parallel with the same result as fractional foreground ticks', () => {
    const a = established();
    a.operations.sites.level = 100;
    a.money = 1e9;
    for (const op of operations) {
      if (!a.operations[op.id].level) investOperation(a, op.id, 1);
      automateOperation(a, op.id);
    }
    const b = structuredClone(a);
    tick(a, 3600, true);
    for (let n = 0; n < 36000; n++) tick(b, 0.1);
    expect(a.completed).toBe(b.completed);
    expect(a.money).toBeCloseTo(b.money, 1);
    expect(a.totalEarned).toBeCloseTo(b.totalEarned, 1);
    for (const op of operations) {
      expect(a.operations[op.id].cycles).toBe(b.operations[op.id].cycles);
      expect(a.operations[op.id].earned).toBe(b.operations[op.id].earned);
      expect(a.operations[op.id].progress).toBeCloseTo(b.operations[op.id].progress, 5);
    }
    expect(migrate(a).operations).toEqual(a.operations);
    expect(revenue(a)).toBeGreaterThan(operationRevenue(a));
    recordMissionProfit(a);
    expect(a.missionState.peakProfit).toBeGreaterThan(0);
  });

  it('caps each absence, carries fractions and cannot pay the same saved interval twice', () => {
    const s = established();
    s.employees = [];
    s.office = 0;
    s.money = 10500;
    investOperation(s, 'sites');
    automateOperation(s, 'sites');
    tick(s, 7.5);
    s.savedAt = 8500;
    const data = new Map<string, string>();
    const storage = new LocalSaveService({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    resume(s, 86400000 + s.savedAt);
    expect(s.operations.sites.progress).toBe(7.5);
    expect(s.pendingOffline).toMatchObject({
      seconds: 28800,
      earned: 86400,
      operationEarned: 86400,
    });
    expect(storage.save(s)).toBe(true);
    const loaded = storage.load().state!;
    resume(loaded, loaded.savedAt);
    expect(loaded).toEqual(s);
    resume(loaded, loaded.savedAt - 1000);
    expect(loaded).toEqual(s);
    resume(loaded, loaded.savedAt + 30000);
    expect(loaded.pendingOffline?.operationEarned).toBe(86490);
    loaded.pendingOffline = null;
    expect(storage.save(loaded)).toBe(true);
    expect(storage.load().state!.money).toBe(86490);
  });

  it('preserves launched operations after dismissing the qualified developer', () => {
    const s = established();
    investOperation(s, 'apps');
    automateOperation(s, 'apps');
    dismiss(s, 1);
    dismiss(s, 2);
    expect(canLaunchOperation(s, 'apps')).toBe(true);
    expect(advanceOperations(s, 300)).toBe(60000);
    expect(migrate(s).operations.apps.automated).toBe(true);
  });

  it('migrates v4 assets and pending receipts without inventing product ownership', () => {
    const s = established();
    s.missionState.claimed = ['firstHire'];
    s.employeeInvestments = { '1': { amount: 75000, estimated: false } };
    s.pendingOffline = { earned: 123, costs: 12, contracts: 1, seconds: 60, operationEarned: 0 };
    const old = v4StateSchema.parse({ ...s, saveVersion: 4 });
    const restored = migrate(old);
    expect(restored.saveVersion).toBe(10);
    expect(restored.money).toBe(s.money);
    expect(restored.contractHistory).toEqual(s.contractHistory);
    expect(restored.employees).toEqual(s.employees);
    expect(restored.employeeInvestments['1']).toEqual(s.employeeInvestments['1']);
    expect(restored.missionState.claimed).toEqual(['firstHire']);
    expect(restored.pendingOffline).toEqual(s.pendingOffline);
    expect(restored.operations).toEqual(newGame().operations);
  });

  it('rejects corrupt cycles and recovers a valid operation backup', () => {
    const s = established();
    investOperation(s, 'sites');
    automateOperation(s, 'sites');
    const data = new Map([[BACKUP_KEY, JSON.stringify(s)]]);
    s.operations.sites.progress = 15;
    expect(() => migrate(s)).toThrow();
    data.set(SAVE_KEY, JSON.stringify(s));
    const storage = new LocalSaveService({
      getItem: (key) => data.get(key) ?? null,
      setItem: () => {},
    });
    expect(storage.load().issue).toBe('backup');
    s.operations.sites.progress = 0;
    s.operations.sites.running = false;
    expect(() => migrate(s)).toThrow();
    s.operations.sites.running = true;
    s.operations.sites.cyclePayout = Infinity;
    expect(() => migrate(s)).toThrow();
  });

  it('exposes product actions through the SDK and preserves operations on restore', () => {
    const sdk = createGameSdk({ initialState: established() });
    expect(sdk.investOperation('sites')).toBe(true);
    expect(sdk.startOperation('sites')).toBe(true);
    expect(sdk.automateOperation('sites')).toBe(true);
    sdk.tick(30);
    const save = sdk.serialize();
    sdk.tick(30);
    sdk.restore(save);
    expect(sdk.getState().operations.sites.earned).toBe(90);
  });

  it('offers localized operate/invest cards and pays new missions only once', () => {
    const s = established();
    let html = renderOperations(s, new Set(), 1);
    expect(html.match(/class="operation-card/g)).toHaveLength(5);
    expect(html).toContain('Lançar operação');
    expect(claimMission(s, 'firstOperation')).toBe(0);
    investOperation(s, 'sites');
    automateOperation(s, 'sites');
    expect(claimMission(s, 'firstOperation')).toBe(500);
    expect(claimMission(s, 'firstAutomation')).toBe(2000);
    expect(claimMission(migrate(s), 'firstAutomation')).toBe(0);
    expect(renderMissions(s)).not.toContain('data-id="firstAutomation"');
    s.settings.locale = 'en-US';
    html = renderOperations(s, new Set(['sites']), 'milestone');
    expect(html).toContain('data-id="sites:milestone"');
    expect(html).toContain('Hosted websites');
    expect(html).not.toContain('undefined');
  });
});
