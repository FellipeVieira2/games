import { balance } from '../config/balance';
import { operations, operationBalance, type OperationId } from '../config/operations';
import type { GameState } from './state';
import { recordMovement } from './finance';

export type InvestmentSize = 1 | 10 | 'milestone';
export function operationMultiplier(level: number): number {
  return 2 ** operationBalance.milestones.filter((milestone) => level >= milestone).length;
}
export function nextOperationMilestone(level: number): number | undefined {
  return operationBalance.milestones.find((milestone) => milestone > level);
}
export function portfolioLevel(s: GameState): number {
  return operations.reduce((sum, op) => sum + s.operations[op.id].level, 0);
}
export function operationRequirements(s: GameState, id: OperationId) {
  const op = operations.find((op) => op.id === id)!;
  return [
    { kind: 'deliveries' as const, current: s.contractHistory[op.project], target: op.deliveries },
    ...(op.office ? [{ kind: 'office' as const, current: s.office, target: op.office }] : []),
    ...(op.developers
      ? [
          {
            kind: 'developers' as const,
            current: s.employees.filter((e) => e.level >= op.developerLevel).length,
            target: op.developers,
          },
        ]
      : []),
    ...(op.portfolio
      ? [{ kind: 'portfolio' as const, current: portfolioLevel(s), target: op.portfolio }]
      : []),
  ];
}
export function canLaunchOperation(s: GameState, id: OperationId): boolean {
  return (
    s.operations[id].level > 0 || operationRequirements(s, id).every((r) => r.current >= r.target)
  );
}
export function operationPayout(id: OperationId, level: number): number {
  return operations.find((op) => op.id === id)!.payout * level * operationMultiplier(level);
}
export function operationRevenue(s: GameState): number {
  return operations.reduce(
    (sum, op) =>
      sum +
      (s.operations[op.id].automated
        ? operationPayout(op.id, s.operations[op.id].level) / op.cycle
        : 0),
    0,
  );
}
export function investmentQuote(s: GameState, id: OperationId, size: InvestmentSize = 1) {
  const op = operations.find((op) => op.id === id)!;
  const level = s.operations[id].level;
  const requested = size === 'milestone' ? (nextOperationMilestone(level) ?? level) - level : size;
  const levels = Math.max(0, Math.min(requested, operationBalance.maxLevel - level));
  let cost = 0;
  for (let i = 0; i < levels; i++)
    cost += Math.ceil(op.cost * operationBalance.costGrowth ** (level + i));
  return {
    levels,
    cost,
    level: level + levels,
    revenueGain: (operationPayout(id, level + levels) - operationPayout(id, level)) / op.cycle,
  };
}
export function investOperation(s: GameState, id: OperationId, size: InvestmentSize = 1): boolean {
  if (!operations.some((op) => op.id === id) || ![1, 10, 'milestone'].includes(size)) return false;
  const quote = investmentQuote(s, id, size);
  if (!canLaunchOperation(s, id) || quote.levels === 0 || s.money < quote.cost) return false;
  const before = s.money;
  s.money -= quote.cost;
  recordMovement(s, 'investment', before);
  s.operations[id].level = quote.level;
  // An in-flight cycle keeps its original payout. New levels affect the following cycle.
  return true;
}
export function startOperation(s: GameState, id: OperationId): boolean {
  if (!operations.some((op) => op.id === id)) return false;
  const owned = s.operations[id];
  if (!owned.level || owned.running) return false;
  owned.running = true;
  owned.cyclePayout = operationPayout(id, owned.level);
  return true;
}
export function automateOperation(s: GameState, id: OperationId): boolean {
  const op = operations.find((op) => op.id === id);
  if (!op) return false;
  const owned = s.operations[id];
  if (!owned.level || owned.automated || s.money < op.automation) return false;
  const before = s.money;
  s.money -= op.automation;
  recordMovement(s, 'automation', before);
  owned.automated = true;
  if (!owned.running) startOperation(s, id);
  return true;
}
export function advanceOperations(s: GameState, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  let earned = 0;
  for (const op of operations) {
    const owned = s.operations[op.id];
    if (!owned.running) continue;
    const total = owned.progress + seconds;
    // Tolerate sub-nanosecond drift from the 100 ms foreground loop at a cycle boundary.
    if (total + 1e-8 < op.cycle) {
      owned.progress = total;
      continue;
    }
    const remaining = Math.max(0, total - op.cycle);
    const extraCycles = owned.automated ? Math.floor((remaining + 1e-8) / op.cycle) : 0;
    const nextPayout = operationPayout(op.id, owned.level);
    const payout = owned.cyclePayout + extraCycles * nextPayout;
    owned.earned = Math.min(balance.maxValue, owned.earned + payout);
    owned.cycles = Math.min(1e9, owned.cycles + 1 + extraCycles);
    owned.running = owned.automated;
    owned.progress = owned.automated ? Math.max(0, remaining - extraCycles * op.cycle) : 0;
    owned.cyclePayout = owned.automated ? nextPayout : 0;
    earned += payout;
  }
  const before = s.money;
  s.money = Math.min(balance.maxValue, s.money + earned);
  recordMovement(s, 'operation', before);
  s.totalEarned = Math.min(balance.maxValue, s.totalEarned + earned);
  return earned;
}
