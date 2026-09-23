import { describe, expect, it } from 'vitest';
import { newGame, v5StateSchema } from '../core/state';
import {
  businessMonthSeconds,
  cashReconciles,
  periodMovements,
  realizedPeriod,
} from '../core/finance';
import { financialProjection, hireDecision, officeDecision } from '../core/finance-view';
import { employeeCost, expand, hire, resume, tick, buyUpgrade, dismiss } from '../core/economy';
import { claimMission } from '../core/missions';
import { automateOperation, investOperation } from '../core/operations';
import { LocalSaveService, migrate } from '../storage/save';
import { renderFinance, renderMovements } from '../ui/finance';

describe('financial foundation', () => {
  it('shows no burn for an empty garage and a finite runway for a loss-making team', () => {
    const s = newGame();
    expect(financialProjection(s)).toMatchObject({ income: 0, costs: 0, result: 0, runway: null });
    s.money = 1500;
    expect(hire(s)).toBe(true);
    const f = financialProjection(s);
    expect(f.contractMonthly).toBe(3000);
    expect(f.salaryMonthly).toBe(360);
    expect(f.result).toBe(2640);
    expect(f.runway).toBeNull();
    s.employees = [];
    s.office = 2;
    const loss = financialProjection(s);
    expect(loss.result).toBeLessThan(0);
    expect(loss.runway).toBe(0);
  });

  it('reconciles purchases, earned contracts, payroll, rewards and refunds with cash', () => {
    const s = newGame();
    s.money = 10000;
    s.financial.baseline = s.money;
    const opening = s.money;
    expect(buyUpgrade(s, 'coffee')).toBe(true);
    expect(hire(s)).toBe(true);
    tick(s, 20);
    expect(claimMission(s, 'firstDelivery')).toBe(50);
    expect(dismiss(s, 1)).toBe(true);
    expect(cashReconciles(s)).toBe(true);
    const entries = periodMovements(s);
    expect(entries.find((e) => e.kind === 'contract')!.amount).toBe(100);
    expect(entries.find((e) => e.kind === 'salary')!.amount).toBe(-12);
    expect(entries.find((e) => e.kind === 'mission')!.amount).toBe(50);
    const actual = realizedPeriod(s);
    expect(actual).toMatchObject({ revenue: 100, expenses: 12, operatingResult: 88 });
    expect(actual.cashChange).toBeCloseTo(s.money - opening);
    expect(actual.cashChange).not.toBe(actual.operatingResult);
    expect(migrate(s).financial).toEqual(s.financial);
  });

  it('records independent operation income while excluding purchases and prizes from profit', () => {
    const s = newGame(1000);
    s.money = 10500;
    s.financial.baseline = s.money;
    s.contractHistory.landing = 5;
    s.completed = 5;
    expect(investOperation(s, 'sites')).toBe(true);
    expect(automateOperation(s, 'sites')).toBe(true);
    tick(s, 30);
    expect(realizedPeriod(s)).toMatchObject({
      revenue: 90,
      expenses: 0,
      operatingResult: 90,
      cashChange: -10410,
    });
    expect(financialProjection(s).recurringMonthly).toBe(1800);
    expect(cashReconciles(s)).toBe(true);
  });

  it('allocates a long offline return to the correct game months and never duplicates it', () => {
    const s = newGame(1000);
    s.money = 1500;
    hire(s);
    resume(s, 1000 + businessMonthSeconds * 3 * 1000);
    expect(s.financial.elapsed).toBe(businessMonthSeconds * 3);
    for (let period = 0; period < 3; period++) {
      const actual = realizedPeriod(s, period);
      expect(actual.revenue).toBe(3000);
      expect(actual.expenses).toBe(360);
      expect(actual.operatingResult).toBe(2640);
    }
    expect(cashReconciles(s)).toBe(true);
    const saved = structuredClone(s);
    resume(s, s.savedAt);
    expect(s).toEqual(saved);
  });

  it('previews cash and recurring costs before hiring or expanding', () => {
    const s = newGame();
    s.money = 10000;
    const hirePreview = hireDecision(s, employeeCost(s), 1);
    expect(hirePreview.cashAfter).toBe(8500);
    expect(hirePreview.costsBefore).toBe(0);
    expect(hirePreview.costsAfter).toBe(360);
    expect(hirePreview.resultAfter).toBe(2640);
    const officePreview = officeDecision(s, 5000);
    expect(officePreview.cashAfter).toBe(5000);
    expect(officePreview.costsAfter).toBe(720);
    expect(officePreview.resultAfter).toBe(-720);
    expect(officePreview.runwayAfter).toBeCloseTo(5000 / 720);
    expect(expand(s)).toBe(true);
    expect(cashReconciles(s)).toBe(true);
  });

  it('migrates a v5 save with all assets and starts the new ledger at its existing balance', () => {
    const old = newGame();
    old.money = 98765;
    old.contractHistory.landing = 5;
    old.completed = 5;
    old.operations.sites.level = 3;
    const legacy = v5StateSchema.parse({ ...old, saveVersion: 5 });
    const migrated = migrate(legacy);
    expect(migrated.saveVersion).toBe(10);
    expect(migrated.financial).toEqual({ baseline: 98765, elapsed: 0, entries: [] });
    expect(migrated.operations.sites.level).toBe(3);
    expect(migrated.money).toBe(98765);
    const data = new Map<string, string>();
    const storage = new LocalSaveService({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    expect(storage.save(migrated)).toBe(true);
    expect(storage.load().state).toEqual(migrated);
  });

  it('keeps the financial history bounded and validates a tampered cash balance', () => {
    const s = newGame();
    s.money = 1500;
    hire(s);
    for (let period = 0; period < 300; period++) {
      // A fresh contract creates a monthly movement without storing every frame.
      tick(s, 600);
    }
    expect(s.financial.entries.length).toBeLessThanOrEqual(256);
    expect(cashReconciles(s)).toBe(true);
    expect(migrate(s).money).toBe(s.money);
    s.money += 1;
    expect(() => migrate(s)).toThrow('Invalid financial ledger');
  });

  it('renders localized summary and grouped movements without missing labels', () => {
    const s = newGame();
    s.money = 100;
    s.financial.baseline = 100;
    buyUpgrade(s, 'coffee');
    const summary = renderFinance(s);
    const movements = renderMovements(s);
    expect(summary).toContain('Projeção mensal');
    expect(movements).toContain('Equipamentos');
    s.settings.locale = 'en-US';
    expect(renderFinance(s)).toContain('Monthly forecast');
    expect(renderMovements(s)).toContain('Equipment');
    expect(summary + movements).not.toContain('undefined');
  });
});
