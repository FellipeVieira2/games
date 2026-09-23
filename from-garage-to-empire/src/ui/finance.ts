import { financialProjection } from '../core/finance-view';
import type { FinancialKind } from '../core/finance';
import type { GameState } from '../core/state';
import { translate, type TextKey } from '../i18n';
import { money } from '../utils/format';
import { canDownsize, loanQuote, saleRefund, totalOverdue } from '../core/recovery';
import { balance, upgrades } from '../config/balance';
import { businessMonthSeconds } from '../core/finance';

const kinds: Record<FinancialKind, TextKey> = {
  contract: 'financeContract',
  operation: 'financeOperation',
  salary: 'financeSalary',
  office: 'financeOffice',
  equipment: 'financeEquipment',
  hire: 'financeHire',
  training: 'financeTraining',
  expansion: 'financeExpansion',
  investment: 'financeInvestment',
  automation: 'financeAutomation',
  mission: 'financeMission',
  dismissal: 'financeDismissal',
  sale: 'financeSale',
  loan: 'financeLoan',
  loanPayment: 'financeLoanPayment',
};

export function renderFinance(s: GameState): string {
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  const cash = (value: number) => money(value, s.settings.locale);
  const f = financialProjection(s);
  const metric = (key: TextKey, value: string, emphasis = false) =>
    `<div class="finance-metric${emphasis ? ' emphasis' : ''}"><span>${t(key)}</span><strong data-finance="${key}">${value}</strong></div>`;
  return `<div class="item-grid finance-summary">
    <article class="item-card finance-card"><h3>${t('financeForecast')}</h3><div class="finance-metrics">
      ${metric('financeIncome', cash(f.income))}${metric('financeCosts', cash(f.costs))}
      ${metric('financeResult', cash(f.result), true)}${metric('financeRunway', f.runway === null ? t('financeNoBurn') : t('financeMonths', { n: f.runway.toFixed(1) }), true)}
    </div><div class="finance-breakdown"><span>${t('financeContract')}</span><b data-finance="financeContract">${cash(f.contractMonthly)}</b><span>${t('financeOperation')}</span><b data-finance="financeOperation">${cash(f.recurringMonthly)}</b><span>${t('financeSalary')}</span><b data-finance="financeSalary">${cash(f.salaryMonthly)}</b><span>${t('financeOffice')}</span><b data-finance="financeOffice">${cash(f.officeMonthly)}</b></div><p class="finance-note">${t('financeForecastHint')}</p></article>
    <article class="item-card finance-card"><h3>${t('financeActual', { n: f.month })}</h3><div class="finance-metrics">
      ${metric('financeActualIncome', cash(f.realized.revenue))}${metric('financeActualCosts', cash(f.realized.expenses))}
      ${metric('financeActualResult', cash(f.realized.operatingResult), true)}${metric('financeCashChange', cash(f.realized.cashChange), true)}
    </div><p class="finance-note">${t('financeActualHint')}</p><p class="finance-note">${t('financeMonthDuration')}</p>${s.financial.elapsed === 0 && s.financial.baseline > 0 ? `<p class="finance-note">${t('financeMigrated')}</p>` : ''}</article>
    <article class="item-card finance-card finance-alert"><h3 data-recovery-status>${t(`recovery_${f.status}`)}</h3><div class="finance-metrics">${metric('recoveryOverdue', cash(f.overdue), true)}${metric('recoveryLiabilities', cash(f.liabilities))}</div><p class="finance-note" data-recovery-hint>${t(f.status === 'crisis' ? 'recoveryCrisisHint' : f.status === 'warning' ? 'recoveryWarningHint' : f.status === 'recovered' ? 'recoveryRecoveredHint' : 'recoveryNormalHint')}</p><button class="secondary-button" data-more-view="recovery">${t('recoveryOpen')}</button></article>
  </div>`;
}

export function renderRecovery(s: GameState): string {
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  const cash = (value: number) => money(value, s.settings.locale);
  const f = financialProjection(s),
    quote = loanQuote(s);
  const debt = totalOverdue(s);
  const nextOffice =
    s.office > 0 ? balance.officeExpenses[s.office - 1]! * businessMonthSeconds : 0;
  const officeNow = balance.officeExpenses[s.office]! * businessMonthSeconds;
  const period = Math.floor(s.financial.elapsed / businessMonthSeconds);
  const canNegotiate =
    s.recovery.overdue.office > 1e-7 &&
    (s.recovery.renegotiatedPeriod < 0 || period - s.recovery.renegotiatedPeriod >= 6);
  return `${s.company.pausedForReview ? `<div class="recovery-review"><strong>${t('bankruptcyReview')}</strong><span>${t('bankruptcyReviewHint')}</span><button class="secondary-button" data-action="continueCompany">${t('bankruptcyContinue')}</button></div>` : ''}<div class="item-grid recovery-grid">
    <article class="item-card recovery-card"><span class="recovery-badge" data-recovery-status>${t(`recovery_${f.status}`)}</span><h3>${t('recoveryObligations')}</h3><dl class="statistics"><div><dt>${t('financeSalary')}</dt><dd data-recovery="salary">${cash(s.recovery.overdue.salary)}</dd></div><div><dt>${t('financeOffice')}</dt><dd data-recovery="office">${cash(s.recovery.overdue.office)}</dd></div><div><dt>${t('financeLoanPayment')}</dt><dd data-recovery="loan">${cash(s.recovery.overdue.loan)}</dd></div></dl><p class="finance-note">${t('recoveryPriority')}</p></article>
    <article class="item-card recovery-card"><h3>${t('recoveryCredit')}</h3><p data-recovery-loan-copy>${s.recovery.loan ? t('recoveryLoanActive', { balance: cash(s.recovery.loan.unbilled + s.recovery.overdue.loan), months: s.recovery.loan.monthsLeft }) : t('recoveryLoanOffer', { principal: cash(quote.principal), total: cash(quote.total), installment: cash(quote.installment) })}</p><button class="secondary-button" data-action="${s.recovery.loan ? 'repayLoan' : 'takeLoan'}" data-recovery-loan ${s.recovery.loan ? (s.money < s.recovery.loan.unbilled + s.recovery.overdue.loan ? 'disabled' : '') : debt <= 1e-7 ? 'disabled' : ''}>${t(s.recovery.loan ? 'recoveryRepayLoan' : 'recoveryTakeLoan')}</button><p class="finance-note">${t('recoveryLoanHint')}</p></article>
    <article class="item-card recovery-card"><h3>${t('recoveryDownsize')}</h3><p>${t('recoveryDownsizePreview', { before: cash(officeNow), after: cash(nextOffice) })}</p><button class="secondary-button" data-action="downsize" ${canDownsize(s) ? '' : 'disabled'}>${t('recoveryDownsizeAction')}</button><p class="finance-note">${t('recoveryDownsizeHint')}</p></article>
    <article class="item-card recovery-card"><h3>${t('recoveryRenegotiate')}</h3><p data-recovery-renegotiate-copy>${t('recoveryRenegotiatePreview', { due: cash(s.recovery.overdue.office), reduction: cash(s.recovery.overdue.office * 0.25) })}</p><button class="secondary-button" data-action="renegotiateRent" ${canNegotiate ? '' : 'disabled'}>${t('recoveryRenegotiateAction')}</button><p class="finance-note">${t('recoveryRenegotiateHint')}</p></article>
    ${upgrades
      .filter((u) => s.upgrades[u.id] > 0)
      .map(
        (u) =>
          `<article class="item-card recovery-card"><h3>${t(u.id)} · ${t('employeeLevel', { n: s.upgrades[u.id] })}</h3><p>${t('recoverySellPreview', { value: cash(saleRefund(s, u.id)) })}</p><button class="secondary-button" data-action="sellUpgrade" data-id="${u.id}">${t('recoverySellAction')}</button><p class="finance-note">${t('recoverySellHint')}</p></article>`,
      )
      .join('')}
  </div>`;
}

export function renderMovements(s: GameState): string {
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  const entries = [...s.financial.entries].reverse();
  return `<div class="finance-movement-heading"><h3>${t('financeMovements')}</h3><p>${t('financeMovementsHint')}</p></div><div class="finance-list">${entries.length ? entries.map((entry) => `<article class="finance-entry"><span class="finance-period">${t('financeMonth', { n: entry.period + 1 })}</span><span>${t(kinds[entry.kind])}</span><strong class="${entry.amount < 0 ? 'outflow' : 'inflow'}" data-finance-entry="${entry.period}-${entry.kind}">${entry.amount >= 0 ? '+' : '−'}${money(Math.abs(entry.amount), s.settings.locale)}</strong></article>`).join('') : `<article class="finance-entry">${t('financeNoMovements')}</article>`}</div>`;
}

export function updateFinance(root: HTMLElement, s: GameState): void {
  const f = financialProjection(s),
    cash = (n: number) => money(n, s.settings.locale);
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  const values: Partial<Record<TextKey, string>> = {
    financeIncome: cash(f.income),
    financeCosts: cash(f.costs),
    financeResult: cash(f.result),
    financeRunway:
      f.runway === null ? t('financeNoBurn') : t('financeMonths', { n: f.runway.toFixed(1) }),
    financeContract: cash(f.contractMonthly),
    financeOperation: cash(f.recurringMonthly),
    financeSalary: cash(f.salaryMonthly),
    financeOffice: cash(f.officeMonthly),
    financeActualIncome: cash(f.realized.revenue),
    financeActualCosts: cash(f.realized.expenses),
    financeActualResult: cash(f.realized.operatingResult),
    financeCashChange: cash(f.realized.cashChange),
    recoveryOverdue: cash(f.overdue),
    recoveryLiabilities: cash(f.liabilities),
  };
  for (const [key, value] of Object.entries(values)) {
    const el = root.querySelector(`[data-finance="${key}"]`);
    if (el && el.textContent !== value) el.textContent = value ?? '';
  }
  for (const entry of s.financial.entries) {
    const el = root.querySelector(`[data-finance-entry="${entry.period}-${entry.kind}"]`);
    if (el) el.textContent = `${entry.amount >= 0 ? '+' : '−'}${cash(Math.abs(entry.amount))}`;
  }
  for (const kind of ['salary', 'office', 'loan'] as const) {
    const el = root.querySelector(`[data-recovery="${kind}"]`);
    if (el) el.textContent = cash(s.recovery.overdue[kind]);
  }
  const loanButton = root.querySelector<HTMLButtonElement>('[data-recovery-loan]');
  if (loanButton)
    loanButton.disabled = s.recovery.loan
      ? s.money < s.recovery.loan.unbilled + s.recovery.overdue.loan
      : totalOverdue(s) <= 1e-7;
  const status = t(`recovery_${f.status}`);
  root.querySelectorAll<HTMLElement>('[data-recovery-status]').forEach((el) => {
    el.textContent = status;
  });
  const hint = root.querySelector<HTMLElement>('[data-recovery-hint]');
  if (hint)
    hint.textContent = t(
      f.status === 'crisis'
        ? 'recoveryCrisisHint'
        : f.status === 'warning'
          ? 'recoveryWarningHint'
          : f.status === 'recovered'
            ? 'recoveryRecoveredHint'
            : 'recoveryNormalHint',
    );
  const loanCopy = root.querySelector<HTMLElement>('[data-recovery-loan-copy]');
  if (loanCopy) {
    const quote = loanQuote(s);
    loanCopy.textContent = s.recovery.loan
      ? t('recoveryLoanActive', {
          balance: cash(s.recovery.loan.unbilled + s.recovery.overdue.loan),
          months: s.recovery.loan.monthsLeft,
        })
      : t('recoveryLoanOffer', {
          principal: cash(quote.principal),
          total: cash(quote.total),
          installment: cash(quote.installment),
        });
  }
  const negotiation = root.querySelector<HTMLElement>('[data-recovery-renegotiate-copy]');
  if (negotiation)
    negotiation.textContent = t('recoveryRenegotiatePreview', {
      due: cash(s.recovery.overdue.office),
      reduction: cash(s.recovery.overdue.office * 0.25),
    });
  const negotiateButton = root.querySelector<HTMLButtonElement>('[data-action="renegotiateRent"]');
  if (negotiateButton) {
    const period = Math.floor(s.financial.elapsed / businessMonthSeconds);
    negotiateButton.disabled =
      s.recovery.overdue.office <= 1e-7 ||
      (s.recovery.renegotiatedPeriod >= 0 && period - s.recovery.renegotiatedPeriod < 6);
  }
}
