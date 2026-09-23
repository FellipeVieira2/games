import { balance } from '../config/balance';
import { businessMonthSeconds } from './finance';
import { totalLiabilities, totalOverdue } from './recovery';
import { newGame, type CompanyReport, type GameState } from './state';

export const minimumCrisisMonths = 2;
export const recoveryGraceMonths = 1;
export function insolvencyLimit(monthlyCosts: number): number {
  return Math.max(1500, monthlyCosts * 1.5);
}

function recordDebt(s: GameState, debt: number): void {
  const points = s.company.debtHistory;
  const month = Math.floor(s.financial.elapsed / businessMonthSeconds);
  if (!debt && !points.length) return;
  if (points.at(-1)?.month === month) points[points.length - 1]!.amount = debt;
  else points.push({ month, amount: debt });
  if (points.length > 64) s.company.debtHistory = points.filter((_, index) => index % 2 === 0);
}

export function updateCompany(s: GameState, monthlyCosts: number, offline = false): void {
  s.company.peakCash = Math.max(s.company.peakCash, s.money);
  s.company.peakTeam = Math.max(s.company.peakTeam, s.employees.length);
  const liabilities = totalLiabilities(s);
  s.company.peakDebt = Math.max(s.company.peakDebt, liabilities);
  recordDebt(s, liabilities);
  if (s.company.bankrupt) return;

  const overdue = totalOverdue(s);
  if (overdue <= 1e-7) {
    s.company.crisisSince = null;
    s.company.graceUntil = null;
    s.company.pausedForReview = false;
    return;
  }
  s.company.crisisSince ??= s.financial.elapsed;
  const qualifies =
    overdue >= insolvencyLimit(monthlyCosts) &&
    s.financial.elapsed - s.company.crisisSince >= minimumCrisisMonths * businessMonthSeconds;
  if (!qualifies) {
    s.company.graceUntil = null;
    if (offline) s.company.pausedForReview = false;
    return;
  }
  if (offline) {
    s.company.pausedForReview = true;
    return;
  }
  if (s.company.graceUntil === null) {
    s.company.graceUntil = s.financial.elapsed + recoveryGraceMonths * businessMonthSeconds;
    return;
  }
  if (s.financial.elapsed >= s.company.graceUntil) s.company.bankrupt = true;
}

export function continueCompany(s: GameState, monthlyCosts: number): void {
  if (!s.company.pausedForReview || s.company.bankrupt) return;
  s.company.pausedForReview = false;
  updateCompany(s, monthlyCosts);
}

export function buildReport(s: GameState, now: number, monthlyCosts: number): CompanyReport {
  if (!s.company.bankrupt) throw new Error('Company is still operating');
  return {
    id: s.career.nextCompanyId,
    endedAt: now,
    elapsed: s.financial.elapsed,
    totalEarned: s.totalEarned,
    maxCash: Math.max(s.company.peakCash, s.money),
    maxTeam: Math.max(s.company.peakTeam, s.employees.length),
    completed: s.completed,
    contractHistory: { ...s.contractHistory },
    products: {
      sites: s.operations.sites.level,
      menus: s.operations.menus.level,
      commerce: s.operations.commerce.level,
      apps: s.operations.apps.level,
      saas: s.operations.saas.level,
    },
    peakDebt: Math.max(s.company.peakDebt, totalLiabilities(s)),
    endingDebt: totalLiabilities(s),
    endingOverdue: totalOverdue(s),
    crisisDuration: s.financial.elapsed - (s.company.crisisSince ?? s.financial.elapsed),
    debtHistory: structuredClone(s.company.debtHistory),
    threshold: insolvencyLimit(monthlyCosts),
    historyPartial: s.company.historyPartial,
  };
}

export function restartCompany(s: GameState, now: number, monthlyCosts: number): GameState {
  const report = buildReport(s, now, monthlyCosts);
  const next = newGame(now);
  next.settings = { ...s.settings };
  next.career = {
    nextCompanyId: s.career.nextCompanyId + 1,
    reports: [...s.career.reports, report].slice(-100),
    records: {
      totalEarned: Math.min(balance.maxValue, s.career.records.totalEarned + report.totalEarned),
      maxCash: Math.max(s.career.records.maxCash, report.maxCash),
      maxTeam: Math.max(s.career.records.maxTeam, report.maxTeam),
      completed: Math.min(1e9, s.career.records.completed + report.completed),
    },
  };
  return next;
}
