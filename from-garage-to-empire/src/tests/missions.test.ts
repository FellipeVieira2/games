import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import { claimMission, missionProgress } from '../core/missions';
import { hire, train, tick, recordMissionProfit, selectContract } from '../core/economy';
import { LocalSaveService, migrate } from '../storage/save';
import { renderMissions } from '../ui/missions';

it('rejects unfinished and unknown missions and pays a reward only once, including after reload', () => {
  const s = newGame();
  expect(claimMission(s, 'firstDelivery')).toBe(0);
  expect(claimMission(s, 'unknown')).toBe(0);
  s.completed = 1;
  s.contractHistory.landing = 1;
  expect(claimMission(s, 'firstDelivery')).toBe(50);
  expect(s.totalEarned).toBe(0);
  expect(claimMission(s, 'firstDelivery')).toBe(0);
  const data = new Map<string, string>();
  const storage = new LocalSaveService({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  });
  expect(storage.save(s)).toBe(true);
  const restored = storage.load().state!;
  expect(restored.money).toBe(50);
  expect(claimMission(restored, 'firstDelivery')).toBe(0);
});

it('records actual junior promotions, not hiring experienced staff or unsuccessful training', () => {
  const s = newGame();
  s.office = 2;
  s.money = 1e9;
  hire(s, 'mid');
  hire(s, 'senior');
  expect(missionProgress(s, 'firstPromotion')).toBe(0);
  hire(s);
  s.employees[2]!.level = 9;
  s.money = 0;
  expect(train(s, 3)).toBe(false);
  expect(s.missionState.promotions).toBe(0);
  s.money = 1e9;
  train(s, 3);
  expect(claimMission(s, 'firstPromotion')).toBe(5000);
  train(s, 3);
  expect(s.missionState.promotions).toBe(1);
});

it('counts shop deliveries offline and retains the net profit milestone after switching work', () => {
  const s = newGame();
  s.office = 2;
  s.reputation = 100;
  s.completed = 6;
  s.contractHistory.landing = 3;
  s.contractHistory.restaurant = 3;
  s.employees = [
    { id: 1, level: 10 },
    { id: 2, level: 2 },
  ];
  s.project = 'shop';
  tick(s, 200, true);
  expect(s.contractHistory.shop).toBeGreaterThanOrEqual(3);
  expect(claimMission(s, 'threeShops')).toBe(1500);
  expect(claimMission(s, 'profitTarget')).toBe(2500);
  selectContract(s, 'landing');
  tick(s, 100);
  const peak = s.missionState.peakProfit;
  recordMissionProfit(s);
  expect(s.missionState.peakProfit).toBe(peak);
  expect(migrate(s).missionState.claimed).toEqual(['threeShops', 'profitTarget']);
});

it('uses net rather than gross revenue and does not count reward money as profit', () => {
  const s = newGame();
  s.employees = [{ id: 1, level: 9 }];
  s.upgrades.monitor = 1;
  recordMissionProfit(s);
  expect(s.missionState.peakProfit).toBeCloseTo(49.5 - 5.4);
  expect(claimMission(s, 'profitTarget')).toBe(0);
  claimMission(s, 'firstHire');
  expect(claimMission(s, 'profitTarget')).toBe(0);
});

it('migrates v2 assets and known delivery history without inventing promotions or previous claims', () => {
  const s = newGame();
  s.money = 5000;
  s.completed = 4;
  s.contractHistory.landing = 4;
  const { missionState: omitted, ...old } = s;
  void omitted;
  const restored = migrate({ ...old, saveVersion: 2 });
  expect(restored.saveVersion).toBe(10);
  expect(restored.money).toBe(5000);
  expect(restored.missionState).toEqual({ claimed: [], promotions: 0, peakProfit: 0 });
  expect(claimMission(restored, 'firstDelivery')).toBe(50);
  expect(renderMissions(restored)).not.toContain('data-id="firstDelivery"');
  expect(renderMissions(restored)).toContain('data-id="firstHire"');
  expect(() =>
    migrate({
      ...restored,
      missionState: { ...restored.missionState, claimed: ['firstDelivery', 'firstDelivery'] },
    }),
  ).toThrow();
});
