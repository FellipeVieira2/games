import { projects, type ProjectId } from '../config/balance';
import type { GameState } from './state';

export const testingModes = ['standard', 'quick', 'complete'] as const;
export type TestingMode = (typeof testingModes)[number];
export function qualityPlan(s: GameState, project: ProjectId, mode = s.quality.preference) {
  const team = s.employees.filter((e) => !s.reservedEmployeeIds.includes(e.id));
  const level = team.length ? team.reduce((sum, e) => sum + e.level, 0) / team.length : 1;
  const complexity = projects.findIndex((p) => p.id === project) + 1;
  const shortage = Math.max(0, complexity - 1 - Math.floor(level));
  const bugs = Math.max(0, shortage + (mode === 'quick' ? 2 : mode === 'complete' ? -2 : 0));
  return { project, mode, bugs, score: Math.max(0, 100 - bugs * 10) };
}
export function qualityPayment(plan: GameState['quality']['active']): number {
  return plan ? Math.max(0.5, 1 - plan.bugs * 0.04) * (plan.mode === 'complete' ? 1.05 : 1) : 1;
}
export function setTestingMode(s: GameState, mode: TestingMode): boolean {
  if (!testingModes.includes(mode) || s.company.bankrupt || s.company.pausedForReview || s.quality.preference === mode) return false;
  s.quality.preference = mode;
  return true;
}
