import type { GameState } from './state';
import { contract, expenses, workPerSecond } from './economy';
import { contractPayment } from './contracts';

/** Allocation belongs to the agency queue, so renewal never silently changes staffing. */
export function assignEmployee(s: GameState, id: number, assigned: boolean): boolean {
  if (s.company.bankrupt || s.company.pausedForReview || !s.employees.some((e) => e.id === id))
    return false;
  const reserved = s.reservedEmployeeIds.includes(id);
  if (reserved === !assigned) return false;
  s.reservedEmployeeIds = s.reservedEmployeeIds.filter((value) => value !== id);
  if (!assigned) s.reservedEmployeeIds.push(id);
  return true;
}

export function allocationPreview(s: GameState, id: number, assigned: boolean) {
  const snapshot = structuredClone(s);
  assignEmployee(snapshot, id, assigned);
  const estimate = (state: GameState) => {
    const rate = workPerSecond(state);
    const seconds = rate > 0 ? (contract(state).work - state.progress) / rate : null;
    return {
      rate,
      seconds,
      payment: seconds === null ? null : contractPayment(state, state.financial.elapsed + seconds),
      costsPerSecond: expenses(state),
    };
  };
  return { before: estimate(s), after: estimate(snapshot) };
}
