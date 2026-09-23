import { describe, expect, it } from 'vitest';
import { newGame } from '../core/state';
import {
  buyUpgrade,
  clickPower,
  contract,
  employeeCost,
  expand,
  expenses,
  hire,
  resume,
  selectContract,
  tap,
  tick,
  train,
  upgradeCost,
  workPerSecond,
} from '../core/economy';
import { balance } from '../config/balance';
describe('economy', () => {
  it('starts alone in a garage with work rather than per-click money', () => {
    const s = newGame(1000);
    tap(s);
    expect(s.money).toBe(0);
    expect(s.progress).toBeGreaterThan(0);
    expect(s.employees).toHaveLength(0);
  });
  it('pays exactly on completion, keeps overflow, and advances XP and reputation', () => {
    const s = newGame();
    s.progress = 99.5;
    const result = tap(s);
    expect(result.completed).toBe(1);
    expect(s.money).toBe(100);
    expect(s.totalEarned).toBe(100);
    expect(s.progress).toBeCloseTo(0.54);
    expect(s.xp).toBe(10);
    expect(s.reputation).toBe(1);
  });
  it('never buys on insufficient funds or over the level cap', () => {
    const s = newGame();
    const snapshot = structuredClone(s);
    expect(buyUpgrade(s, 'coffee')).toBe(false);
    expect(s).toEqual(snapshot);
    s.money = 100;
    expect(buyUpgrade(s, 'coffee')).toBe(true);
    expect(s.money).toBe(0);
    expect(clickPower(s)).toBe(2);
    expect(upgradeCost(s, 'coffee')).toBe(185);
    s.money = 1e9;
    s.upgrades.coffee = balance.maxUpgradeLevel;
    expect(buyUpgrade(s, 'coffee')).toBe(false);
  });
  it('applies equipment multipliers consistently to taps and employees', () => {
    const s = newGame();
    s.money = 10000;
    hire(s);
    buyUpgrade(s, 'monitor');
    expect(clickPower(s)).toBeCloseTo(1.1);
    expect(workPerSecond(s)).toBeCloseTo(5.5);
  });
  it('enforces capacity, charges escalating costs and allows training', () => {
    const s = newGame();
    s.money = 20000;
    expect(hire(s)).toBe(true);
    expect(employeeCost(s)).toBe(2475);
    expect(hire(s)).toBe(false);
    expect(expand(s)).toBe(true);
    expect(hire(s)).toBe(true);
    expect(train(s, 1)).toBe(true);
    expect(workPerSecond(s)).toBe(15);
    expect(expenses(s)).toBeCloseTo(3);
    expect(train(s, 999)).toBe(false);
  });
  it('produces passive contracts and charges operating expenses without debt', () => {
    const s = newGame();
    s.money = 1500;
    hire(s);
    const result = tick(s, 20);
    expect(result).toEqual({ earned: 100, costs: 12, contracts: 1 });
    expect(s.money).toBe(88);
    s.money = 0;
    tick(s, 1);
    expect(s.money).toBe(0);
  });
  it('rejects locked contracts and queues unlocked work without discarding progress', () => {
    const s = newGame();
    expect(selectContract(s, 'restaurant')).toBe(false);
    s.reputation = 5;
    s.contractHistory.landing = 3;
    s.completed = 3;
    s.progress = 90;
    s.employees = [{ id: 1, level: 1 }];
    s.money = 200;
    expect(selectContract(s, 'restaurant')).toBe(true);
    expect(s.project).toBe('landing');
    tick(s, 4);
    expect(s.project).toBe('restaurant');
    expect(s.queuedProject).toBeNull();
    expect(s.progress).toBe(10);
    expect(s.completed).toBe(4);
  });
  it('activates deep work for ten seconds and decays focus', () => {
    const s = newGame();
    for (let i = 0; i < 25; i++) tap(s);
    expect(s.deepWork).toBe(10);
    tick(s, 10);
    expect(s.deepWork).toBe(0);
    expect(s.focus).toBe(30);
    tick(s, 20);
    expect(s.focus).toBe(0);
  });
  it('caps offline time and never duplicates already credited income', () => {
    const s = newGame(1000);
    s.employees = [{ id: 1, level: 1 }];
    s.money = 1000;
    resume(s, 1000 + 24 * 3600 * 1000);
    expect(s.pendingOffline?.seconds).toBe(8 * 3600);
    expect(s.completed).toBe(1440);
    expect(s.pendingOffline?.earned).toBe(144000);
    expect(s.pendingOffline?.costs).toBe(17280);
    const after = structuredClone(s);
    resume(s, s.savedAt);
    expect(s).toEqual(after);
    expect(s.playSeconds).toBe(0);
  });
  it('ignores backward clock changes without moving the checkpoint backwards', () => {
    const s = newGame(5000);
    resume(s, 1000);
    expect(s.savedAt).toBe(5000);
    expect(s.money).toBe(0);
  });
  it('does not extend the saved deep-work boost while offline', () => {
    const s = newGame(1000);
    s.employees = [{ id: 1, level: 1 }];
    s.deepWork = 10;
    resume(s, 21000);
    expect(s.completed).toBe(1);
    expect(s.deepWork).toBe(0);
  });
  it('aggregates offline work like foreground simulation when solvent', () => {
    const a = newGame();
    a.money = 1e5;
    a.employees = [{ id: 1, level: 2 }];
    a.reputation = 5;
    a.contractHistory.landing = 3;
    a.completed = 3;
    a.progress = 12;
    selectContract(a, 'restaurant');
    const b = structuredClone(a);
    tick(a, 3600, true);
    for (let i = 0; i < 3600; i++) tick(b, 1);
    expect(a.money).toBeCloseTo(b.money, 5);
    expect(a.completed).toBe(b.completed);
    expect(a.progress).toBeCloseTo(b.progress, 8);
  });
  it('never spends past the final office, and ignores invalid time deltas', () => {
    const s = newGame();
    s.money = 1e6;
    expand(s);
    expand(s);
    const before = s.money;
    expect(expand(s)).toBe(false);
    expect(s.money).toBe(before);
    const snapshot = structuredClone(s);
    tick(s, NaN);
    tick(s, -1);
    expect(s).toEqual(snapshot);
    expect(contract(s).id).toBe('landing');
  });
});
