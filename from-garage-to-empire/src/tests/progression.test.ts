import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import { buyUpgrade, expand, hire, selectContract, tap, tick, train } from '../core/economy';
import { projects } from '../config/balance';
import { canSelectProject } from '../core/progression';

it('reaches automation and the upgraded garage with a reproducible two-tap/second strategy', () => {
  const s = newGame(0);
  let firstUpgrade = 0,
    firstEmployee = 0,
    firstExpansion = 0;
  for (let elapsed = 0.5; elapsed <= 900; elapsed += 0.5) {
    tick(s, 0.5);
    tap(s);
    if (!s.upgrades.coffee && buyUpgrade(s, 'coffee')) firstUpgrade = elapsed;
    if (s.upgrades.coffee && !s.upgrades.keyboard) buyUpgrade(s, 'keyboard');
    if (s.upgrades.keyboard && !s.employees.length && hire(s)) firstEmployee = elapsed;
    if (s.employees.length && !s.office && expand(s)) {
      firstExpansion = elapsed;
      break;
    }
    const next = [...projects].reverse().find((p) => canSelectProject(s, p.id))!;
    selectContract(s, next.id);
  }
  expect(firstUpgrade).toBeGreaterThan(0);
  expect(firstUpgrade).toBeLessThanOrEqual(60);
  expect(firstEmployee).toBeGreaterThan(firstUpgrade);
  expect(firstEmployee).toBeLessThanOrEqual(240);
  expect(firstExpansion).toBeGreaterThan(firstEmployee);
  expect(firstExpansion).toBeLessThanOrEqual(900);
  expect(s.office).toBe(1);
  expect(s.employees).toHaveLength(1);
});

it('progresses through all four project tiers with hiring, training and office expansion', () => {
  const s = newGame(0);
  const milestones: Record<string, number> = {};
  for (let seconds = 0.5; seconds <= 3600; seconds += 0.5) {
    tick(s, 0.5);
    tap(s);
    if (!s.upgrades.coffee && buyUpgrade(s, 'coffee')) milestones.coffee = seconds;
    if (s.upgrades.coffee && !s.upgrades.keyboard) buyUpgrade(s, 'keyboard');
    if (!s.employees.length && s.upgrades.keyboard && hire(s)) milestones.employee = seconds;
    if (s.office === 0 && s.employees.length && expand(s)) milestones.studio = seconds;
    if (s.office === 1) {
      if (s.employees.length < 2) hire(s);
      for (const e of s.employees) if (e.level < 2) train(s, e.id);
      if (expand(s)) milestones.coworking = seconds;
    }
    if (s.office === 2) {
      if (s.employees.length < 3) hire(s);
      for (const e of s.employees) if (e.level < 3) train(s, e.id);
    }
    const next = [...projects].reverse().find((p) => canSelectProject(s, p.id))!;
    if (selectContract(s, next.id) && !milestones[`select_${next.id}`])
      milestones[`select_${next.id}`] = seconds;
    for (const p of projects)
      if (s.contractHistory[p.id] && !milestones[`done_${p.id}`])
        milestones[`done_${p.id}`] = seconds;
    if (s.contractHistory.app) break;
  }
  expect(s.contractHistory.app).toBeGreaterThan(0);
  expect(s.contractHistory.shop).toBeGreaterThanOrEqual(3);
  expect(s.contractHistory.restaurant).toBeGreaterThanOrEqual(3);
  expect(milestones.select_app).toBeGreaterThan(milestones.done_shop!);
  expect(milestones.done_app! - milestones.select_app!).toBeGreaterThan(240);
  console.info('Progression simulation (seconds, 2 taps/s):', JSON.stringify(milestones));
});
