import { startContract } from './contracts';
import { balance, upgrades, type UpgradeId } from '../config/balance';
import { careerRank } from './career';
import { businessMonthSeconds, recordMovement } from './finance';
import { bestAvailableProject, canSelectProject } from './progression';
import type { GameState } from './state';

export type ObligationKind = keyof GameState['recovery']['overdue'];
const obligationKinds: ObligationKind[] = ['salary', 'office', 'loan'];
const epsilon = 1e-7;
export function totalOverdue(s: GameState): number {
  return obligationKinds.reduce((total, kind) => total + s.recovery.overdue[kind], 0);
}
export function totalLiabilities(s: GameState): number {
  return totalOverdue(s) + (s.recovery.loan?.unbilled ?? 0);
}
export function settleOverdue(s: GameState): number {
  const previouslyDue = totalOverdue(s);
  let paid = 0;
  for (const kind of obligationKinds) {
    const amount = Math.min(s.money, s.recovery.overdue[kind]);
    if (amount <= epsilon) continue;
    const before = s.money;
    s.money = Math.max(0, s.money - amount);
    s.recovery.overdue[kind] = Math.max(0, s.recovery.overdue[kind] - amount);
    if (s.recovery.overdue[kind] < epsilon) s.recovery.overdue[kind] = 0;
    recordMovement(s, kind === 'loan' ? 'loanPayment' : kind, before);
    paid += before - s.money;
  }
  if (previouslyDue > epsilon && totalOverdue(s) <= epsilon)
    s.recovery.recoveredUntil = s.financial.elapsed + businessMonthSeconds;
  if (s.recovery.loan && s.recovery.loan.unbilled <= epsilon && s.recovery.overdue.loan <= epsilon)
    s.recovery.loan = null;
  return paid;
}
export function chargeObligation(s: GameState, kind: 'salary' | 'office', amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = s.money;
  const paid = Math.min(s.money, amount);
  s.money = Math.max(0, s.money - paid);
  recordMovement(s, kind, before);
  const unpaid = amount - paid;
  if (unpaid > epsilon)
    s.recovery.overdue[kind] = Math.min(balance.maxValue, s.recovery.overdue[kind] + unpaid);
  return before - s.money;
}
export function loanQuote(s: GameState) {
  const payroll = s.employees.reduce(
    (sum, employee) =>
      sum + balance.employeeSalary * employee.level * careerRank(employee.level).salaryMultiplier,
    0,
  );
  const monthlyCosts = (payroll + balance.officeExpenses[s.office]!) * businessMonthSeconds;
  const principal = Math.max(5000, Math.ceil(monthlyCosts * 3));
  const total = Math.ceil(principal * 1.18);
  return { principal, total, installment: total / 12, months: 12 };
}
export function takeLoan(s: GameState): boolean {
  if (s.recovery.loan || totalOverdue(s) <= epsilon) return false;
  const quote = loanQuote(s);
  if (s.money > balance.maxValue - quote.principal) return false;
  const before = s.money;
  s.money += quote.principal;
  recordMovement(s, 'loan', before);
  s.recovery.loan = {
    principal: quote.principal,
    unbilled: quote.total,
    installment: quote.installment,
    monthsLeft: quote.months,
  };
  settleOverdue(s);
  return true;
}
export function billLoanMonth(s: GameState): number {
  const loan = s.recovery.loan;
  if (!loan || loan.monthsLeft <= 0) return 0;
  const due = loan.monthsLeft === 1 ? loan.unbilled : Math.min(loan.unbilled, loan.installment);
  loan.unbilled = Math.max(0, loan.unbilled - due);
  loan.monthsLeft--;
  s.recovery.overdue.loan = Math.min(balance.maxValue, s.recovery.overdue.loan + due);
  return settleOverdue(s);
}
export function repayLoan(s: GameState): boolean {
  const loan = s.recovery.loan;
  if (!loan) return false;
  const total = loan.unbilled + s.recovery.overdue.loan;
  if (s.money + epsilon < total) return false;
  const before = s.money;
  s.money = Math.max(0, s.money - total);
  recordMovement(s, 'loanPayment', before);
  s.recovery.overdue.loan = 0;
  s.recovery.loan = null;
  return true;
}
export function saleRefund(s: GameState, id: UpgradeId): number {
  const upgrade = upgrades.find((u) => u.id === id);
  if (!upgrade || s.upgrades[id] <= 0) return 0;
  return Math.floor(upgrade.cost * balance.upgradeCostMultiplier ** (s.upgrades[id] - 1) * 0.5);
}
export function sellUpgrade(s: GameState, id: UpgradeId): boolean {
  const refund = saleRefund(s, id);
  if (!refund) return false;
  s.upgrades[id]--;
  const before = s.money;
  s.money = Math.min(balance.maxValue, s.money + refund);
  recordMovement(s, 'sale', before);
  settleOverdue(s);
  return true;
}
export function canDownsize(s: GameState): boolean {
  return s.office > 0 && s.employees.length <= balance.maxEmployees[s.office - 1]!;
}
export function downsize(s: GameState): boolean {
  if (!canDownsize(s)) return false;
  s.office--;
  if (s.queuedProject && !canSelectProject(s, s.queuedProject)) s.queuedProject = null;
  if (!canSelectProject(s, s.project)) {
    if (s.progress > 0) s.legacyContract = s.project;
    else {
      s.project = bestAvailableProject(s);
      startContract(s);
      s.legacyContract = null;
    }
  }
  return true;
}
export function renegotiateRent(s: GameState): number {
  const period = Math.floor(s.financial.elapsed / businessMonthSeconds);
  if (
    s.recovery.overdue.office <= epsilon ||
    (s.recovery.renegotiatedPeriod >= 0 && period - s.recovery.renegotiatedPeriod < 6)
  )
    return 0;
  const reduction = s.recovery.overdue.office * 0.25;
  s.recovery.overdue.office -= reduction;
  s.recovery.renegotiatedPeriod = period;
  s.reputation = Math.max(0, s.reputation - 2);
  if (totalOverdue(s) <= epsilon)
    s.recovery.recoveredUntil = s.financial.elapsed + businessMonthSeconds;
  return reduction;
}
export function recoveryStatus(
  s: GameState,
  monthlyResult: number,
): 'normal' | 'warning' | 'crisis' | 'recovered' {
  if (totalOverdue(s) > epsilon) return 'crisis';
  if (s.recovery.recoveredUntil > s.financial.elapsed) return 'recovered';
  if (monthlyResult < 0 && s.money / -monthlyResult < 1) return 'warning';
  return 'normal';
}
