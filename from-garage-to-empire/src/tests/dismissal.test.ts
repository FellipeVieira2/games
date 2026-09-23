import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import {
  hire,
  train,
  trainCost,
  employeeCost,
  dismissalRefund,
  dismiss,
  tick,
  selectContract,
} from '../core/economy';
import { migrate } from '../storage/save';

it('refunds 30% of actual hiring and training investment only once', () => {
  const s = newGame();
  s.money = 1e8;
  const cost = employeeCost(s, 'mid');
  hire(s, 'mid');
  const training = trainCost(10);
  train(s, 1);
  expect(dismissalRefund(s, 1)).toBe(Math.floor((cost + training) * 0.3));
  const before = s.money,
    refund = dismissalRefund(s, 1);
  expect(dismiss(s, 1)).toBe(true);
  expect(s.money).toBe(before + refund);
  expect(s.employees).toHaveLength(0);
  expect(s.employeeInvestments['1']).toBeUndefined();
  expect(dismiss(s, 1)).toBe(false);
  expect(s.money).toBe(before + refund);
});
it('reuses vacant identities without duplicating remaining employees and saves correctly', () => {
  const s = newGame();
  s.money = 1e8;
  s.office = 2;
  hire(s);
  hire(s);
  hire(s);
  dismiss(s, 2);
  hire(s, 'senior');
  expect(s.employees.map((e) => e.id)).toEqual([1, 3, 2]);
  expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
});
it('lets an in-progress contract finish once after losing required staff, then locks it', () => {
  const s = newGame();
  s.money = 1e7;
  s.office = 1;
  s.reputation = 100;
  s.completed = 6;
  s.contractHistory.landing = 3;
  s.contractHistory.restaurant = 3;
  hire(s, 'mid');
  hire(s, 'mid');
  selectContract(s, 'shop');
  tick(s, 1);
  expect(s.progress).toBeGreaterThan(0);
  dismiss(s, 2);
  expect(s.legacyContract).toBe('shop');
  expect(migrate(s).project).toBe('shop');
  tick(s, 200, true);
  expect(s.contractHistory.shop).toBe(1);
  expect(s.project).toBe('restaurant');
  expect(s.legacyContract).toBeNull();
  expect(selectContract(s, 'shop')).toBe(false);
});
it('cancels ineligible queued contracts and switches an unstarted contract safely', () => {
  const s = newGame();
  s.money = 1e7;
  s.office = 1;
  s.reputation = 100;
  s.completed = 6;
  s.contractHistory.landing = 3;
  s.contractHistory.restaurant = 3;
  hire(s);
  hire(s);
  train(s, 1);
  train(s, 2);
  s.progress = 10;
  selectContract(s, 'shop');
  dismiss(s, 2);
  expect(s.queuedProject).toBeNull();
  s.project = 'restaurant';
  s.progress = 0;
  dismiss(s, 1);
  expect(s.project).toBe('landing');
  expect(migrate(s).legacyContract).toBeNull();
});
it('migrates old employees with a disclosed conservative estimate and preserves new ledgers', () => {
  const s = newGame();
  s.employees = [{ id: 1, level: 10 }];
  const { employeeInvestments: unused, ...old } = s;
  void unused;
  const restored = migrate({ ...old, saveVersion: 3 });
  expect(restored.employeeInvestments['1']?.estimated).toBe(true);
  expect(dismissalRefund(restored, 1)).toBeGreaterThan(0);
  expect(migrate(restored)).toEqual(restored);
});
