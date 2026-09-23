import { expect, it } from 'vitest';
import { newGame, type GameState } from '../core/state';
import {
  buyUpgrade,
  expand,
  hire,
  selectContract,
  tap,
  tick,
  train,
  resume,
  trainCost,
  employeeProduction,
  employeeSalary,
  contract,
} from '../core/economy';
import { projects } from '../config/balance';
import { operations } from '../config/operations';
import { canSelectProject } from '../core/progression';
import {
  automateOperation,
  canLaunchOperation,
  investOperation,
  investmentQuote,
  operationRevenue,
  portfolioLevel,
} from '../core/operations';
import { claimMission } from '../core/missions';
import { missions } from '../config/missions';
import { migrate } from '../storage/save';

// Deliberately simple strategy: prepare the agency, then save for the best payback
// among product milestones, automation bundles, and training two future mid-level devs.
function reinvest(s: GameState) {
  for (const m of missions) claimMission(s, m.id);
  for (let purchases = 0; purchases < 600; purchases++) {
    const candidates: { cost: number; gain: number; buy: () => void }[] = [];
    for (const op of operations) {
      const owned = s.operations[op.id];
      if (!canLaunchOperation(s, op.id)) continue;
      if (!owned.level) {
        candidates.push({
          cost: op.cost + op.automation,
          gain: op.payout / op.cycle,
          buy: () => {
            investOperation(s, op.id);
            automateOperation(s, op.id);
          },
        });
      } else {
        for (const size of [1, 'milestone'] as const) {
          const quote = investmentQuote(s, op.id, size);
          if (quote.levels)
            candidates.push({
              cost: quote.cost,
              gain: quote.revenueGain,
              buy: () => {
                investOperation(s, op.id, size);
              },
            });
        }
      }
    }
    for (const e of s.employees.slice(0, 2))
      if (e.level < 10) {
        const p = contract(s);
        candidates.push({
          cost: trainCost(e.level),
          gain:
            ((employeeProduction(s, e.level + 1) - employeeProduction(s, e.level)) * p.pay) /
              p.work -
            (employeeSalary(e.level + 1) - employeeSalary(e.level)),
          buy: () => {
            train(s, e.id);
          },
        });
      }
    candidates.sort((a, b) => a.cost / a.gain - b.cost / b.gain);
    const best = candidates[0];
    if (!best || best.cost > s.money) return;
    best.buy();
    for (const m of missions) claimMission(s, m.id);
  }
  throw new Error('Investment loop did not converge');
}

it('keeps meaningful investments beyond the first hour across seven daily returns', () => {
  const s = newGame(0);
  const milestones: Record<string, number> = {};
  for (let seconds = 0.5; seconds <= 3600; seconds += 0.5) {
    tick(s, 0.5);
    tap(s);
    if (!s.contractHistory.app) {
      if (!s.upgrades.coffee) buyUpgrade(s, 'coffee');
      if (s.upgrades.coffee && !s.upgrades.keyboard) buyUpgrade(s, 'keyboard');
      if (!s.employees.length && s.upgrades.keyboard) hire(s);
      if (!s.office && s.employees.length) expand(s);
      if (s.office === 1) {
        if (s.employees.length < 2) hire(s);
        for (const e of s.employees) if (e.level < 2) train(s, e.id);
        expand(s);
      }
      if (s.office === 2) {
        if (s.employees.length < 3) hire(s);
        for (const e of s.employees) if (e.level < 3) train(s, e.id);
      }
    } else reinvest(s);
    const next = [...projects].reverse().find((p) => canSelectProject(s, p.id))!;
    selectContract(s, next.id);
    if (s.contractHistory.app && !milestones.firstApp) milestones.firstApp = seconds;
    if (s.operations.sites.automated && !milestones.firstAutomation)
      milestones.firstAutomation = seconds;
  }
  expect(s.operations.sites.automated).toBe(true);
  expect(s.operations.saas.level).toBe(0);
  const timeline = [
    {
      day: 0,
      levels: portfolioLevel(s),
      income: Math.round(operationRevenue(s)),
      operations: Object.values(s.operations).map((op) => op.level),
    },
  ];
  s.savedAt = 3600000;
  for (let day = 1; day <= 7; day++) {
    resume(s, s.savedAt + 86400000);
    expect(s.pendingOffline!.seconds).toBe(28800);
    expect(s.pendingOffline!.operationEarned).toBeGreaterThan(0);
    s.pendingOffline = null;
    reinvest(s);
    // A ten-minute return visit; reinvest once per minute without repeated tapping.
    for (let minute = 0; minute < 10; minute++) {
      tick(s, 60);
      reinvest(s);
    }
    s.savedAt += 600000;
    expect(migrate(s).operations).toEqual(s.operations);
    timeline.push({
      day,
      levels: portfolioLevel(s),
      income: Math.round(operationRevenue(s)),
      operations: Object.values(s.operations).map((op) => op.level),
    });
  }
  console.info('Retention simulation:', JSON.stringify({ milestones, timeline }));
  expect(timeline[1]!.levels).toBeGreaterThan(timeline[0]!.levels);
  expect(timeline[7]!.levels).toBeGreaterThan(timeline[3]!.levels);
  expect(timeline[7]!.income).toBeGreaterThan(timeline[1]!.income);
  expect(Object.values(s.operations).filter((op) => op.automated).length).toBeGreaterThanOrEqual(3);
  expect(portfolioLevel(s)).toBeLessThan(500);
});
