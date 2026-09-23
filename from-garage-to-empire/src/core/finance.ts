import type { GameState } from './state';

// The engine uses seconds. A 600-second business month keeps the display readable
// without changing existing production or salary rates.
export const businessMonthSeconds = 600;
export const financialKinds = [
  'contract',
  'operation',
  'salary',
  'office',
  'equipment',
  'hire',
  'training',
  'expansion',
  'investment',
  'automation',
  'mission',
  'dismissal',
  'sale',
  'loan',
  'loanPayment',
] as const;
export type FinancialKind = (typeof financialKinds)[number];

export function recordMovement(s: GameState, kind: FinancialKind, before: number): void {
  s.company.peakCash = Math.max(s.company.peakCash, before, s.money);
  // Saves migrated from older builds start with their existing cash as the baseline.
  // A host using the headless SDK may also seed cash directly before its first action.
  if (s.financial.entries.length === 0 && s.financial.baseline !== before)
    s.financial.baseline = before;
  const amount = s.money - before;
  if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) return;
  const period = Math.floor(s.financial.elapsed / businessMonthSeconds);
  const existing = [...s.financial.entries]
    .reverse()
    .find((entry) => entry.period === period && entry.kind === kind);
  if (existing) existing.amount += amount;
  else s.financial.entries.push({ period, kind, amount });
  while (s.financial.entries.length > 256) {
    const removed = s.financial.entries.shift()!;
    s.financial.baseline += removed.amount;
  }
}

export function periodMovements(
  s: GameState,
  period = Math.floor(s.financial.elapsed / businessMonthSeconds),
) {
  return s.financial.entries.filter((entry) => entry.period === period);
}

export function realizedPeriod(
  s: GameState,
  period = Math.floor(s.financial.elapsed / businessMonthSeconds),
) {
  const entries = periodMovements(s, period);
  const sum = (...kinds: FinancialKind[]) =>
    entries
      .filter((entry) => kinds.includes(entry.kind))
      .reduce((total, entry) => total + entry.amount, 0);
  const revenue = sum('contract', 'operation');
  const expenses = Math.max(0, -sum('salary', 'office'));
  return {
    revenue,
    expenses,
    operatingResult: revenue - expenses,
    cashChange: entries.reduce((total, entry) => total + entry.amount, 0),
  };
}

export function cashReconciles(s: GameState): boolean {
  return (
    Math.abs(
      s.financial.baseline + s.financial.entries.reduce((n, e) => n + e.amount, 0) - s.money,
    ) < Math.max(1e-5, Math.abs(s.money) * 1e-12)
  );
}
