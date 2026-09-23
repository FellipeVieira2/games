import { describe, expect, it } from 'vitest';
import { newGame, v9StateSchema } from '../core/state';
import { allocationPreview, assignEmployee } from '../core/allocation';
import {
  dismiss,
  expenses,
  hire,
  selectContract,
  tap,
  tick,
  train,
  workPerSecond,
} from '../core/economy';
import { migrate } from '../storage/save';
import { financialProjection, hireDecision } from '../core/finance-view';
import { createGameSdk } from '../sdk';

function staffed() {
  const s = newGame(1000);
  s.money = 100000;
  s.financial.baseline = s.money;
  s.office = 2;
  s.employees = [
    { id: 1, level: 3 },
    { id: 2, level: 3 },
    { id: 3, level: 4 },
  ];
  s.contractHistory = { landing: 3, restaurant: 3, shop: 3, app: 0 };
  s.completed = 9;
  s.reputation = 100;
  selectContract(s, 'app');
  return s;
}

describe('agency team allocation', () => {
  it('previews remaining work, payment and unchanged payroll without mutating state', () => {
    const s = staffed();
    tick(s, 100, true);
    const before = structuredClone(s);
    const preview = allocationPreview(s, 3, false);
    expect(preview.before.rate).toBe(50);
    expect(preview.after.rate).toBe(30);
    expect(preview.before.seconds).toBe(340);
    expect(preview.after.seconds).toBeCloseTo(17000 / 30);
    expect(preview.before.payment).toBe(40000);
    expect(preview.after.payment).toBe(36000);
    expect(preview.after.costsPerSecond).toBe(preview.before.costsPerSecond);
    expect(s).toEqual(before);
  });
  it('changes only assigned capacity; deadlines and salary stay fixed', () => {
    const s = staffed();
    const deadline = s.contractBook.active!.deadline;
    const salary = expenses(s);
    expect(assignEmployee(s, 3, false)).toBe(true);
    expect(assignEmployee(s, 3, false)).toBe(false);
    expect(workPerSecond(s)).toBe(30);
    tick(s, 500, true);
    expect(s.progress).toBe(15000);
    expect(s.contractBook.active!.deadline).toBe(deadline);
    expect(expenses(s)).toBe(salary);
    expect(assignEmployee(s, 3, true)).toBe(true);
    expect(workPerSecond(s)).toBe(50);
    expect(financialProjection(s).costs).toBe(salary * 600);
  });
  it('allows manual work with everyone in reserve but never grants free salaries or offline production', () => {
    const s = staffed();
    for (const e of s.employees) assignEmployee(s, e.id, false);
    const money = s.money;
    tick(s, 10, true);
    expect(s.progress).toBe(0);
    expect(s.money).toBeCloseTo(money - expenses(s) * 10);
    expect(financialProjection(s).contractMonthly).toBe(0);
    expect(allocationPreview(s, 1, false).after.seconds).toBeNull();
    tap(s);
    expect(s.progress).toBeGreaterThan(0);
  });
  it('preserves staffing across a queue change and matches online/offline simulation', () => {
    const s = staffed();
    assignEmployee(s, 3, false);
    tick(s, 1);
    selectContract(s, 'restaurant');
    const online = structuredClone(s);
    tick(s, 1200, true);
    for (let i = 0; i < 12000; i++) tick(online, 0.1);
    expect(s.project).toBe('restaurant');
    expect(s.reservedEmployeeIds).toEqual([3]);
    expect(online.money).toBeCloseTo(s.money, 5);
    expect(online.contractBook.clients).toEqual(s.contractBook.clients);
    expect(migrate(s).reservedEmployeeIds).toEqual([3]);
  });
  it('training reserve staff does not create production; dismissal clears a reused hiring slot', () => {
    const s = staffed();
    assignEmployee(s, 1, false);
    expect(train(s, 1)).toBe(true);
    expect(workPerSecond(s)).toBe(35);
    expect(dismiss(s, 1)).toBe(true);
    expect(s.reservedEmployeeIds).toEqual([]);
    expect(hire(s)).toBe(true);
    expect(s.employees.find((e) => e.id === 1)!.level).toBe(1);
    expect(workPerSecond(s)).toBe(40);
  });
  it('migrates v9 with everyone assigned and rejects dangling or duplicate reservations', () => {
    const s = staffed();
    const migrated = migrate(v9StateSchema.parse({ ...s, saveVersion: 9 }));
    expect(migrated.reservedEmployeeIds).toEqual([]);
    expect(workPerSecond(migrated)).toBe(50);
    expect(migrated.contractBook).toEqual(s.contractBook);
    s.reservedEmployeeIds = [6];
    expect(() => migrate(s)).toThrow('Invalid team allocation');
    s.reservedEmployeeIds = [1, 1];
    expect(() => migrate(s)).toThrow('Invalid team allocation');
  });
  it('exposes allocation through the SDK and blocks invalid or paused changes', () => {
    const sdk = createGameSdk({ initialState: staffed() });
    expect(sdk.assignEmployee(2, false)).toBe(true);
    expect(sdk.allocationPreview(2, true).after.rate).toBe(50);
    sdk.restore(sdk.serialize());
    expect(sdk.getState().reservedEmployeeIds).toEqual([2]);
    const s = staffed();
    expect(assignEmployee(s, 6, false)).toBe(false);
    s.company.pausedForReview = true;
    expect(assignEmployee(s, 1, false)).toBe(false);
  });
  it('includes recovered on-time payments when previewing a hire', () => {
    const s = staffed();
    assignEmployee(s, 3, false);
    const preview = hireDecision(s, 0, 4);
    const expectedContract = ((50 * 40000) / 22000) * 600;
    expect(preview.resultAfter).toBeCloseTo(expectedContract - (expenses(s) + 2.4) * 600);
  });
});
