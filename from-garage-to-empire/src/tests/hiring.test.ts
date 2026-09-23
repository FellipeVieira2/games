import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import { employeeSalary, employeeCost, hire, trainCost, expenses, tick } from '../core/economy';
import { renderHiring, renderEmployee } from '../ui/team';
import { migrate } from '../storage/save';

it('adds salary premiums at promotions and uses the same payroll offline', () => {
  expect(employeeSalary(9)).toBeCloseTo(5.4);
  expect(employeeSalary(10)).toBeCloseTo(6 * 1.3);
  expect(employeeSalary(19)).toBeCloseTo(11.4 * 1.3);
  expect(employeeSalary(20)).toBeCloseTo(12 * 1.3 * 1.3);
  const s = newGame();
  s.office = 1;
  s.employees = [
    { id: 1, level: 10 },
    { id: 2, level: 20 },
  ];
  s.money = 100000;
  expect(expenses(s)).toBeCloseTo(7.8 + 20.28 + 1.2);
  expect(tick(s, 60, true).costs).toBeCloseTo((7.8 + 20.28 + 1.2) * 60);
});

it('charges a premium above buying and training a junior, increasing with team size', () => {
  const s = newGame();
  let investment = employeeCost(s);
  for (let level = 1; level < 10; level++) investment += trainCost(level);
  expect(employeeCost(s, 'mid')).toBe(Math.ceil(investment * 1.25));
  expect(employeeCost(s, 'senior')).toBeGreaterThan(employeeCost(s, 'mid') * 20);
  const before = employeeCost(s, 'mid');
  s.employees = [{ id: 1, level: 1 }];
  expect(employeeCost(s, 'mid')).toBeGreaterThan(before);
});

it('hires experienced devs at the correct level, persists them, and enforces funds and slots', () => {
  const s = newGame();
  s.money = employeeCost(s, 'mid') - 1;
  const snapshot = structuredClone(s);
  expect(hire(s, 'mid')).toBe(false);
  expect(s).toEqual(snapshot);
  s.money++;
  expect(hire(s, 'mid')).toBe(true);
  expect(s.money).toBe(0);
  expect(s.employees[0]!.level).toBe(10);
  s.money = 1e10;
  s.financial.baseline =
    s.money - s.financial.entries.reduce((sum, entry) => sum + entry.amount, 0);
  expect(hire(s, 'senior')).toBe(false);
  s.office = 1;
  expect(hire(s, 'senior')).toBe(true);
  expect(s.employees[1]).toEqual({ id: 2, level: 20 });
  expect(migrate(JSON.parse(JSON.stringify(s))).employees).toEqual(s.employees);
});

it('shows all hiring options and the salary change before a promotion', () => {
  const s = newGame();
  const html = renderHiring(s);
  for (const rank of ['junior', 'mid', 'senior']) expect(html).toContain(`data-id="${rank}"`);
  expect(html.match(/ disabled/g)).toHaveLength(3);
  expect(renderEmployee(s, { id: 1, level: 9 }, true)).toContain('Salário:');
});
