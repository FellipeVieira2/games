import { qualityPlan, qualityPayment } from './quality';
import { projects } from '../config/balance';
import type { GameState } from './state';

// One recurring customer per specialty for the first management slice.
export const contractTerms = {
  landing: { client: 'Ateliê Aurora', deadline: null, complexity: 1 },
  restaurant: { client: 'Bistrô da Praça', deadline: 240, complexity: 2 },
  shop: { client: 'Mercado Horizonte', deadline: 360, complexity: 3 },
  app: { client: 'Conecta Mobilidade', deadline: 480, complexity: 4 },
} as const;
export function startContract(s: GameState, at = s.financial.elapsed): void {
  const duration = contractTerms[s.project].deadline;
  s.quality.active = qualityPlan(s, s.project);
  s.contractBook.active = {
    project: s.project,
    startedAt: at,
    deadline: duration === null ? null : at + duration,
  };
}
export function isContractLate(s: GameState, at = s.financial.elapsed): boolean {
  const active = s.contractBook.active;
  return active?.project === s.project && active.deadline !== null && at > active.deadline + 1e-6;
}
export function contractPayment(s: GameState, at = s.financial.elapsed): number {
  return projects.find((p) => p.id === s.project)!.pay * qualityPayment(s.quality.active) * (isContractLate(s, at) ? 0.9 : 1);
}
export function recordDelivery(s: GameState, at: number, payment: number): void {
  const history = s.contractBook.clients[s.project];
  if (s.quality.active) { s.quality.bugsFixed += s.quality.active.bugs; s.quality.lastScore = s.quality.active.score; }
  history.delivered++;
  if (isContractLate(s, at)) history.late++;
  history.earned += payment;
}
