import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import { careerRank } from '../core/career';
import { employeeProduction, train, trainCost, workPerSecond, tick } from '../core/economy';
import { migrate } from '../storage/save';
import { employeePortrait, renderEmployee } from '../ui/team';

it('promotes at level 10 and level 20 and applies bonuses to the promoted employee only', () => {
  const s = newGame();
  s.office = 1;
  s.employees = [
    { id: 1, level: 9 },
    { id: 2, level: 1 },
  ];
  s.money = trainCost(9);
  expect(careerRank(9).id).toBe('junior');
  expect(workPerSecond(s)).toBe(50);
  expect(train(s, 1)).toBe(true);
  expect(s.money).toBe(0);
  expect(careerRank(10).id).toBe('mid');
  expect(employeeProduction(s, 10)).toBe(75);
  expect(workPerSecond(s)).toBe(80);
  s.employees[0]!.level = 19;
  s.money = trainCost(19);
  expect(careerRank(19).id).toBe('mid');
  expect(train(s, 1)).toBe(true);
  expect(careerRank(20).id).toBe('senior');
  expect(workPerSecond(s)).toBe(205);
  expect(train(s, 1)).toBe(false);
  expect(s.money).toBe(0);
});

it('does not promote or mutate the employee when training is unaffordable', () => {
  const s = newGame();
  s.employees = [{ id: 1, level: 9 }];
  s.money = trainCost(9) - 1;
  const before = structuredClone(s);
  expect(train(s, 1)).toBe(false);
  expect(s).toEqual(before);
});

it('derives careers after loading and uses bonuses with equipment and offline work', () => {
  const s = newGame();
  s.office = 1;
  s.employees = [
    { id: 1, level: 10 },
    { id: 2, level: 20 },
  ];
  s.upgrades.monitor = 1;
  const restored = migrate(JSON.parse(JSON.stringify(s)));
  expect(workPerSecond(restored)).toBeCloseTo(302.5);
  tick(restored, 40, true);
  expect(restored.completed).toBe(121);
  expect(restored.totalEarned).toBe(12100);
});

it('renders stable individual portraits, promotion previews, and a clear final career state', () => {
  const portraits = [1, 2, 3, 4, 5, 6].map(employeePortrait);
  expect(new Set(portraits).size).toBe(6);
  expect(employeePortrait(1)).toBe(portraits[0]);
  const s = newGame();
  s.money = 1e9;
  const before = renderEmployee(s, { id: 1, level: 9 }, true);
  expect(before).toContain('Maya Lima');
  expect(before).toContain('Treinar e promover');
  expect(before).toContain('Produção: 45/s → 75/s');
  const after = renderEmployee(s, { id: 1, level: 20 }, true);
  expect(after).toContain('Desenvolvedor sênior');
  expect(after).toContain('+100% de produtividade');
  expect(after).toContain('data-locked="true" disabled');
  expect(after).not.toContain('Treinar e promover');
});
