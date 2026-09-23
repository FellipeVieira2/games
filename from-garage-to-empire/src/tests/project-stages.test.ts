import { describe, expect, it } from 'vitest';
import { currentStage, stagePlan } from '../core/project-stages';
import { newGame } from '../core/state';
import { selectContract, tap, tick } from '../core/economy';
import { migrate } from '../storage/save';
import { createGameSdk } from '../sdk';
import { cashReconciles } from '../core/finance';

function staffed() {
  const s = newGame(1000);
  s.money = 10000;
  s.financial.baseline = s.money;
  s.employees = [{ id: 1, level: 1 }];
  s.contractHistory.landing = 3;
  s.completed = 3;
  s.reputation = 5;
  return s;
}

describe('development, testing and delivery', () => {
  it('partitions existing work without changing total effort for any project', () => {
    for (const id of ['landing', 'restaurant', 'shop', 'app'] as const) {
      const plan = stagePlan(id);
      expect(plan[0]!.end).toBe(plan[1]!.start);
      expect(plan[1]!.end).toBe(plan[2]!.start);
      expect(plan.reduce((sum, phase) => sum + phase.work, 0)).toBe(plan[2]!.end);
      expect(currentStage({ project: id, progress: plan[0]!.end }).id).toBe('testing');
      expect(currentStage({ project: id, progress: plan[1]!.end }).id).toBe('delivery');
    }
  });
  it('does not pay, grant XP or switch queued contracts before delivery completes', () => {
    const s = staffed();
    tick(s, 1, true);
    selectContract(s, 'restaurant');
    tick(s, 13, true);
    expect(currentStage(s).id).toBe('testing');
    expect(s.totalEarned).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.project).toBe('landing');
    tick(s, 5, true);
    expect(currentStage(s).id).toBe('delivery');
    expect(s.completed).toBe(3);
    tick(s, 1, true);
    expect(s.totalEarned).toBe(100);
    expect(s.completed).toBe(4);
    expect(s.project).toBe('restaurant');
    expect(currentStage(s).id).toBe('development');
    expect(s.contractBook.active!.startedAt).toBe(20);
    expect(cashReconciles(s)).toBe(true);
  });
  it('carries click overflow across stages and multiple renewals without duplicate payment', () => {
    const s = staffed();
    s.progress = 69;
    s.upgrades.coffee = 5;
    s.upgrades.keyboard = 5;
    s.upgrades.monitor = 5;
    s.upgrades.laptop = 5;
    s.upgrades.fiber = 5;
    s.deepWork = 10;
    const result = tap(s);
    expect(result.completed).toBe(Math.floor((69 + result.work) / 100));
    expect(s.progress).toBeCloseTo((69 + result.work) % 100);
    expect(s.totalEarned).toBe(result.completed * 100);
    expect(s.contractBook.clients.landing.delivered).toBe(result.completed);
  });
  it('restores existing saves directly into the correct stage without changing work or money', () => {
    for (const progress of [69, 70, 94, 95, 99]) {
      const s = staffed();
      s.progress = progress;
      const restored = migrate(s);
      expect(restored.progress).toBe(progress);
      expect(restored.money).toBe(s.money);
      expect(currentStage(restored)).toEqual(currentStage(s));
      const sdk = createGameSdk({ initialState: restored });
      expect(sdk.getContractStage()).toEqual(currentStage(s));
    }
  });
  it('matches online/offline across stages, renewals and a reload during testing', () => {
    const s = staffed();
    selectContract(s, 'restaurant');
    tick(s, 120, true);
    expect(currentStage(s).id).toBe('testing');
    const online = migrate(s);
    tick(s, 1500, true);
    for (let i = 0; i < 15000; i++) tick(online, 0.1);
    expect(online.money).toBeCloseTo(s.money, 5);
    expect(online.progress).toBeCloseTo(s.progress, 5);
    expect(online.contractBook.clients).toEqual(s.contractBook.clients);
    expect(currentStage(online).id).toBe(currentStage(s).id);
  });
  it('does not bypass testing with reserve staff or renew deadlines at a stage boundary', () => {
    const s = staffed();
    selectContract(s, 'restaurant');
    const deadline = s.contractBook.active!.deadline;
    tick(s, 112, true);
    expect(currentStage(s).id).toBe('testing');
    s.reservedEmployeeIds = [1];
    tick(s, 200, true);
    expect(currentStage(s).progress).toBe(0);
    expect(s.totalEarned).toBe(0);
    expect(s.contractBook.active!.deadline).toBe(deadline);
    s.reservedEmployeeIds = [];
    tick(s, 48, true);
    expect(s.totalEarned).toBe(900);
  });
});
