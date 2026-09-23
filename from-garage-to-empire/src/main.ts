import { stagePlan } from './core/project-stages';
import { contractTerms } from './core/contracts';
import { allocationPreview, assignEmployee } from './core/allocation';
import { contractQuote } from './core/economy';
import { projects } from './config/balance';
import { canSelectProject } from './core/progression';
import Phaser from 'phaser';
import { dismiss, dismissalRefund } from './core/economy';
import { claimMission } from './core/missions';
import { investOperation, startOperation, automateOperation } from './core/operations';
import { type OperationId } from './config/operations';
import { decisionProjection, hireDecision, officeDecision } from './core/finance-view';
import { employeeCost } from './core/economy';
import {
  canDownsize,
  downsize,
  loanQuote,
  renegotiateRent,
  repayLoan,
  saleRefund,
  sellUpgrade,
  takeLoan,
  totalOverdue,
} from './core/recovery';
import { businessMonthSeconds } from './core/finance';
import { continueCompany, insolvencyLimit, restartCompany } from './core/bankruptcy';
import { expenses } from './core/economy';
import { recordMissionProfit } from './core/economy';
import { balance, type UpgradeId, type ProjectId } from './config/balance';
import { newGame, type CompanyReport } from './core/state';
import { careerRank, type CareerId } from './core/career';
import { employeeNames } from './config/characters';
import { tap, tick, resume, hire, expand, buyUpgrade, train, selectContract } from './core/economy';
import { LocalSaveService } from './storage/save';
import { ConsoleAnalytics } from './services/mocks';
import { WebAudioService } from './audio/audio';
import { observeLifecycle, vibrate } from './services/platform';
import { installWebUpdates } from './services/web-update';
import { OfficeScene } from './scenes/OfficeScene';
import { GameUI, type UIAction } from './ui/ui';
import { translate, type TextKey } from './i18n';
import { money, formatNumber } from './utils/format';
import './ui/style.css';
import './ui/studio.css';
import './ui/viewport.css';
import './ui/operations.css';
import './ui/finance.css';
import './ui/responsive.css';

async function start(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app')!;
  const saves = new LocalSaveService({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const loaded = saves.load();
  const state = loaded.state ?? newGame();
  if (!loaded.state && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    state.settings.reducedMotion = true;
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(state.settings.locale, key, params);
  document.documentElement.lang = state.settings.locale;
  resume(state, Date.now());
  const analytics = new ConsoleAnalytics();
  const audio = new WebAudioService();
  let active = !document.hidden;
  let last = performance.now();
  let autosave = 0;
  let musicStarted = false;
  let disposed = false;
  let pendingContract: ProjectId | null = null;
  let pendingAllocation: { id: number; assigned: boolean } | null = null;
  const save = () => {
    state.savedAt = Math.max(state.savedAt, Date.now());
    const ok = saves.save(state);
    ui.saved(ok);
    return ok;
  };
  const scene = new OfficeScene(
    () => state,
    () => ui.toast(t('employeeTalk')),
  );
  let pendingDismissal: number | null = null;
  let pendingHire: CareerId | null = null;
  let pendingSale: UpgradeId | null = null;
  let historyIndex = 0;
  let historyDetails = false;
  const monthlyCosts = () => expenses(state) * businessMonthSeconds;
  const bankruptcyBody = () =>
    `<p>${t('bankruptcyReason', { due: money(totalOverdue(state), state.settings.locale), limit: money(insolvencyLimit(monthlyCosts()), state.settings.locale), months: Math.floor((state.financial.elapsed - (state.company.crisisSince ?? state.financial.elapsed)) / businessMonthSeconds) })}</p><p>${t('careerRevenue')}: <strong>${money(state.totalEarned, state.settings.locale)}</strong></p><p>${t('careerDebtPeak')}: <strong>${money(state.company.peakDebt, state.settings.locale)}</strong></p>`;
  const reportBody = (report: CompanyReport) => {
    const cash = (value: number) => money(value, state.settings.locale);
    const rows = historyDetails
      ? ([
          ['careerDuration', Math.floor(report.elapsed / businessMonthSeconds)],
          ['careerTeamPeak', report.maxTeam],
          ['careerDebtPeak', cash(report.peakDebt)],
        ] as const)
      : ([
          ['careerRevenue', cash(report.totalEarned)],
          ['careerCashPeak', cash(report.maxCash)],
          ['careerContracts', report.completed],
          ['careerDebtFinal', cash(report.endingDebt)],
        ] as const);
    const points = report.debtHistory;
    const shown =
      points.length <= 3
        ? points
        : [points[0]!, points[Math.floor(points.length / 2)]!, points.at(-1)!];
    const contracts = Object.entries(report.contractHistory)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => `${t(id as TextKey)} ${count}`)
      .join(' ? ');
    const products = Object.entries(report.products)
      .filter(([, level]) => level > 0)
      .map(([id, level]) => `${t(`operation_${id}` as TextKey)} ${level}`)
      .join(' ? ');
    return `<p>${t('careerCompany', { n: report.id })} · ${new Date(report.endedAt).toLocaleDateString(state.settings.locale)}</p><dl class="statistics">${rows.map(([key, value]) => `<div><dt>${t(key)}</dt><dd>${value}</dd></div>`).join('')}</dl>${historyDetails ? `<p class="fine-print">${t('careerContractBreakdown', { values: contracts || '0' })}</p><p class="fine-print">${t('careerProductBreakdown', { values: products || '0' })}</p>` : ''}${historyDetails && points.length ? `<p class="fine-print">${t('careerDebtPath', { path: shown.map((point) => `${t('careerMonth', { n: point.month + 1 })} ${cash(point.amount)}`).join(' → ') })}</p>` : ''}${historyDetails && report.historyPartial ? `<p class="fine-print">${t('careerPartial')}</p>` : ''}<button class="secondary-button" data-action="historyDetails">${t(historyDetails ? 'careerSummary' : 'careerDetails')}</button>`;
  };
  const showHistory = () => {
    const reports = state.career.reports;
    historyIndex = Math.max(0, Math.min(historyIndex, reports.length - 1));
    const report = reports[historyIndex];
    const nav =
      reports.length > 1
        ? `<div class="history-nav"><button class="secondary-button" data-action="historyPrev" ${historyIndex === 0 ? 'disabled' : ''}>${t('careerPrev')}</button><span>${historyIndex + 1}/${reports.length}</span><button class="secondary-button" data-action="historyNext" ${historyIndex === reports.length - 1 ? 'disabled' : ''}>${t('careerNext')}</button></div>`
        : '';
    ui.modal(
      'careerHistory',
      `${report ? reportBody(report) : `<p>${t('careerEmpty')}</p>`}${nav}`,
      'understood',
    );
  };
  const previewBody = (price: number, preview: ReturnType<typeof decisionProjection>) =>
    `<p>${t('financeCashAfter')}: <strong>${money(preview.cashAfter, state.settings.locale)}</strong></p>` +
    `<p>${t('financeCostBeforeAfter', { before: money(preview.costsBefore, state.settings.locale), after: money(preview.costsAfter, state.settings.locale) })}</p>` +
    `<p>${t('financeResultBeforeAfter', { before: money(preview.resultBefore, state.settings.locale), after: money(preview.resultAfter, state.settings.locale) })}</p>` +
    `<p>${t('financeRunwayAfter', { value: preview.runwayAfter === null ? t('financeNoBurn') : t('financeMonths', { n: preview.runwayAfter.toFixed(1) }) })}</p>` +
    `<p class="fine-print">${t('financePrice', { value: money(price, state.settings.locale) })}. ${t('financeEstimateHint')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`;
  function action(a: UIAction): void {
    if (!active) return;
    if (a.type === 'expand' && state.company.bankrupt) a = { type: 'restart' };
    if (
      state.company.bankrupt &&
      ![
        'restart',
        'restartConfirm',
        'history',
        'historyPrev',
        'historyNext',
        'historyDetails',
        'setting',
        'locale',
      ].includes(a.type)
    )
      return;
    if (
      state.company.pausedForReview &&
      ![
        'offline',
        'continueCompany',
        'takeLoan',
        'loanConfirm',
        'repayLoan',
        'downsize',
        'downsizeConfirm',
        'renegotiateRent',
        'renegotiateConfirm',
        'sellUpgrade',
        'sellConfirm',
        'dismiss',
        'dismissConfirm',
        'history',
        'historyPrev',
        'historyNext',
        'historyDetails',
        'setting',
        'locale',
      ].includes(a.type)
    )
      return;
    if (!musicStarted) {
      musicStarted = true;
      audio.music(state.settings.music);
    }
    let changed = false;
    if (a.type === 'stages') {
      const rows = stagePlan(state.project)
        .map(
          (stage) =>
            '<div><dt>' +
            t(stage.id) +
            '</dt><dd>' +
            t('workAmount', { n: formatNumber(stage.work, state.settings.locale) }) +
            '</dd></div>',
        )
        .join('');
      ui.modal(
        'stageTitle',
        '<dl class="statistics">' + rows + '</dl><p>' + t('stageExplanation') + '</p>',
      );
      return;
    }
    if (a.type === 'allocation') {
      const id = Number(a.id);
      if (!state.employees.some((employee) => employee.id === id)) return;
      const assigned = state.reservedEmployeeIds.includes(id);
      pendingAllocation = { id, assigned };
      const preview = allocationPreview(state, id, assigned);
      const fmt = (n: number) => formatNumber(n, state.settings.locale);
      const duration = (n: number | null) =>
        n === null ? t('contractManual') : t('contractMinutes', { n: fmt(n / 60) });
      const payment = (n: number | null) => (n === null ? '—' : money(n, state.settings.locale));
      const rows = [
        [t('productivity'), `${fmt(preview.before.rate)} → ${fmt(preview.after.rate)}/s`],
        [
          t('allocationRemaining'),
          `${duration(preview.before.seconds)} → ${duration(preview.after.seconds)}`,
        ],
        [
          t('contractEstimatedPayment'),
          `${payment(preview.before.payment)} → ${payment(preview.after.payment)}`,
        ],
      ];
      ui.modal(
        'allocationTitle',
        `<p>${employeeNames[(id - 1) % employeeNames.length]} → ${t(assigned ? 'allocationContracts' : 'allocationReserve')}</p><dl class="statistics">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>${t('allocationHint')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'financeConfirm',
        'allocationConfirm',
      );
      return;
    }
    if (a.type === 'allocationConfirm') {
      const pending = pendingAllocation;
      pendingAllocation = null;
      if (pending) {
        const previous = structuredClone(state);
        if (assignEmployee(state, pending.id, pending.assigned)) {
          recordMissionProfit(state);
          if (!save()) {
            Object.assign(state, previous);
            ui.toast(t('saveError'));
          }
          ui.renderTab();
        }
      }
      ui.closeDialog();
      return;
    }
    if (
      a.type === 'history' ||
      a.type === 'historyPrev' ||
      a.type === 'historyNext' ||
      a.type === 'historyDetails'
    ) {
      if (a.type === 'history') {
        historyIndex = state.career.reports.length - 1;
        historyDetails = false;
      } else if (a.type === 'historyDetails') historyDetails = !historyDetails;
      else {
        historyIndex += a.type === 'historyNext' ? 1 : -1;
        historyDetails = false;
      }
      showHistory();
      return;
    }
    if (a.type === 'continueCompany') {
      const previous = structuredClone(state);
      continueCompany(state, monthlyCosts());
      if (!save()) {
        Object.assign(state, previous);
        ui.renderTab();
        ui.toast(t('saveError'));
        return;
      }
      ui.renderTab();
      if (state.company.bankrupt) ui.showBankruptcy(bankruptcyBody());
      return;
    }
    if (a.type === 'restart') {
      ui.modal(
        'bankruptcyTitle',
        `${bankruptcyBody()}<p>${t('bankruptcyConfirmBody')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'bankruptcyConfirm',
        'restartConfirm',
      );
      return;
    }
    if (a.type === 'restartConfirm') {
      const previous = structuredClone(state);
      const next = restartCompany(state, Date.now(), monthlyCosts());
      Object.assign(state, next);
      if (!save()) {
        Object.assign(state, previous);
        ui.renderTab();
        ui.toast(t('saveError'));
        return;
      }
      historyIndex = state.career.reports.length - 1;
      scene.refreshOffice();
      ui.resetToCompany();
      return;
    }
    if (a.type === 'takeLoan') {
      if (state.recovery.loan || totalOverdue(state) <= 1e-7) return;
      const quote = loanQuote(state);
      ui.modal(
        'recoveryCredit',
        `<p>${t('recoveryLoanOffer', { principal: money(quote.principal, state.settings.locale), total: money(quote.total, state.settings.locale), installment: money(quote.installment, state.settings.locale) })}</p><p>${t('recoveryLoanHint')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'financeConfirm',
        'loanConfirm',
      );
      return;
    }
    if (a.type === 'downsize') {
      if (!canDownsize(state)) return;
      ui.modal(
        'recoveryDownsize',
        `<p>${t('recoveryDownsizeHint')}</p><p>${t('recoveryDownsizePreview', { before: money(balance.officeExpenses[state.office]! * businessMonthSeconds, state.settings.locale), after: money(balance.officeExpenses[state.office - 1]! * businessMonthSeconds, state.settings.locale) })}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'financeConfirm',
        'downsizeConfirm',
      );
      return;
    }
    if (a.type === 'renegotiateRent') {
      if (state.recovery.overdue.office <= 0) return;
      ui.modal(
        'recoveryRenegotiate',
        `<p>${t('recoveryRenegotiatePreview', { due: money(state.recovery.overdue.office, state.settings.locale), reduction: money(state.recovery.overdue.office * 0.25, state.settings.locale) })}</p><p>${t('recoveryRenegotiateHint')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'financeConfirm',
        'renegotiateConfirm',
      );
      return;
    }
    if (a.type === 'sellUpgrade') {
      const id = a.id as UpgradeId;
      const refund = saleRefund(state, id);
      if (!refund) return;
      pendingSale = id;
      ui.modal(
        'recoverySellAction',
        `<p>${t(id)} · ${t('recoverySellPreview', { value: money(refund, state.settings.locale) })}</p><p>${t('recoverySellHint')}</p><button class="secondary-button" data-close>${t('cancel')}</button>`,
        'financeConfirm',
        'sellConfirm',
      );
      return;
    }
    if (
      ['loanConfirm', 'repayLoan', 'downsizeConfirm', 'renegotiateConfirm', 'sellConfirm'].includes(
        a.type,
      )
    ) {
      const previous = structuredClone(state);
      const recovered =
        a.type === 'loanConfirm'
          ? takeLoan(state)
          : a.type === 'repayLoan'
            ? repayLoan(state)
            : a.type === 'downsizeConfirm'
              ? downsize(state)
              : a.type === 'renegotiateConfirm'
                ? renegotiateRent(state) > 0
                : pendingSale !== null && sellUpgrade(state, pendingSale);
      pendingSale = null;
      if (!recovered) {
        ui.closeDialog();
        return;
      }
      recordMissionProfit(state);
      if (!save()) {
        Object.assign(state, previous);
        ui.update();
        ui.toast(t('saveError'));
        return;
      }
      if (a.type === 'downsizeConfirm' || a.type === 'sellConfirm') scene.refreshOffice();
      ui.closeDialog();
      ui.renderTab();
      ui.toast(t('recoveryDone'));
      return;
    }
    if (
      a.type === 'operationInvest' ||
      a.type === 'operationStart' ||
      a.type === 'operationAutomate'
    ) {
      const [id, size] = (a.id ?? '').split(':');
      const previous = structuredClone(state);
      const invested = a.type === 'operationInvest';
      const ok = invested
        ? investOperation(
            state,
            id as OperationId,
            size === 'milestone' ? 'milestone' : (Number(size) as 1 | 10),
          )
        : a.type === 'operationStart'
          ? startOperation(state, id as OperationId)
          : automateOperation(state, id as OperationId);
      if (!ok) return;
      recordMissionProfit(state);
      if (!save()) {
        Object.assign(state, previous);
        ui.renderTab();
        ui.toast(t('saveError'));
        return;
      }
      ui.renderTab();
      if (a.type !== 'operationStart')
        ui.toast(t(invested ? 'operationInvested' : 'operationAutomated'));
      if (state.settings.sfx) audio.play('upgrade');
      return;
    }
    if (a.type === 'camera') {
      const close = scene.toggleFraming();
      const button = root.querySelector('[data-action="camera"]');
      if (button) button.textContent = t(close ? 'wideView' : 'closeView');
      return;
    }
    if (a.type === 'work') {
      const before = state.totalEarned;
      const result = tap(state);
      scene.feedback(`+${formatNumber(result.work, state.settings.locale)}`, result.completed > 0);
      if (state.settings.sfx) audio.play(result.completed ? 'reward' : 'tap');
      if (state.settings.haptics) void vibrate();
      if (result.completed) {
        ui.toast(t('rewardToast', { n: money(state.totalEarned - before, state.settings.locale) }));
        analytics.track('contract_completed');
        save();
        ui.renderTab();
      }
      ui.update();
      return;
    }
    if (a.type === 'dismiss') {
      const employee = state.employees.find((e) => e.id === Number(a.id));
      if (!employee) return;
      pendingDismissal = employee.id;
      ui.modal(
        'dismissTitle',
        '<p>' +
          t('dismissExplanation', {
            name: employeeNames[(employee.id - 1) % employeeNames.length]!,
            amount: money(dismissalRefund(state, employee.id), state.settings.locale),
          }) +
          '</p><p class="fine-print">' +
          t(
            state.employeeInvestments[String(employee.id)]?.estimated
              ? 'estimatedInvestment'
              : 'dismissContractHint',
          ) +
          '</p><button class="secondary-button" data-close>' +
          t('cancel') +
          '</button>',
        'dismiss',
        'dismissConfirm',
      );
      return;
    }
    if (a.type === 'dismissConfirm') {
      if (pendingDismissal === null) return;
      const previous = structuredClone(state);
      const removed = dismiss(state, pendingDismissal);
      pendingDismissal = null;
      if (removed && !save()) {
        Object.assign(state, previous);
        ui.update();
        return;
      }
      ui.closeDialog();
      if (removed) {
        scene.refreshOffice();
        ui.renderTab();
        ui.toast(t('dismissed'));
      }
      return;
    }
    if (a.type === 'mission') {
      const previous = structuredClone(state);
      const reward = claimMission(state, a.id ?? '');
      if (reward && !save()) {
        Object.assign(state, previous);
        ui.update();
        return;
      }
      if (reward) {
        ui.toast(t('missionReward', { n: money(reward, state.settings.locale) }));
        if (state.settings.sfx) audio.play('reward');
        ui.update();
      }
      return;
    }
    if (a.type === 'upgrade') {
      changed = buyUpgrade(state, a.id as UpgradeId);
      if (changed) {
        ui.toast(t('upgradeToast'));
        analytics.track('upgrade_purchased', { id: a.id! });
        if (Object.values(state.upgrades).reduce((a, b) => a + b, 0) === 1)
          analytics.track('first_upgrade');
      }
    }
    if (a.type === 'hire') {
      const rank = (a.id ?? 'junior') as CareerId;
      const cost = employeeCost(state, rank);
      if (state.money < cost || state.employees.length >= balance.maxEmployees[state.office]!)
        return;
      pendingHire = rank;
      const level = rank === 'senior' ? 20 : rank === 'mid' ? 10 : 1;
      ui.modal(
        'financeDecisionTitle',
        previewBody(cost, hireDecision(state, cost, level)),
        'financeConfirm',
        'hireConfirm',
      );
      return;
    }
    if (a.type === 'hireConfirm') {
      if (!pendingHire) return;
      changed = hire(state, pendingHire);
      pendingHire = null;
      ui.closeDialog();
      if (changed) {
        ui.toast(t('hireToast'));
        analytics.track(state.employees.length === 1 ? 'first_employee' : 'employee_hired');
        if (state.employees.length === 1) analytics.track('tutorial_completed');
      }
    }
    if (a.type === 'train') {
      const employee = state.employees.find((e) => e.id === Number(a.id));
      const previousRank = employee && careerRank(employee.level);
      changed = train(state, Number(a.id));
      if (changed && employee) {
        const rank = careerRank(employee.level);
        ui.toast(
          previousRank?.id !== rank.id
            ? t('promotionToast', {
                name: employeeNames[(employee.id - 1) % employeeNames.length]!,
                rank: t(rank.id),
                n: (rank.multiplier - 1) * 100,
              })
            : t('trainingToast'),
        );
      }
    }
    if (a.type === 'expand') {
      if (totalOverdue(state) > 1e-7) {
        ui.openRecovery();
        return;
      }
      if (state.office === 2) {
        ui.openOperations();
        return;
      }
      const cost = balance.officeCosts[state.office + 1]!;
      if (state.money < cost) return;
      ui.modal(
        'financeDecisionTitle',
        previewBody(cost, officeDecision(state, cost)),
        'financeConfirm',
        'expandConfirm',
      );
      return;
    }
    if (a.type === 'expandConfirm') {
      changed = expand(state);
      if (changed) {
        analytics.track('office_unlocked', { office: state.office });
        scene.refreshOffice();
        ui.modal(
          'congratulations',
          `<p>${t('expansionText')}</p><h3>${t(`officeName${state.office}` as TextKey)}</h3>`,
          'continue',
        );
        scene.feedback('★', true);
      }
    }
    if (a.type === 'contractConditions') {
      const p = projects.find((p) => p.id === a.id);
      if (!p) return;
      const history = state.contractBook.clients[p.id];
      ui.modal(
        'contractConditions',
        '<p>' +
          contractTerms[p.id].client +
          '</p><p>' +
          t('contractTermsHint') +
          '</p><p>' +
          t('contractEstimateHint') +
          '</p><p>' +
          t('contractClientHistory', { n: history.delivered, late: history.late }) +
          '</p><button class="secondary-button" data-action="contract" data-id="' +
          p.id +
          '">' +
          t('contractReview') +
          '</button>',
      );
      return;
    }
    if (a.type === 'contract') {
      const p = projects.find((p) => p.id === a.id);
      if (!p || (!canSelectProject(state, p.id) && p.id !== state.project)) return;
      const quote = contractQuote(state, p.id);
      const viewing = p.id === state.project || p.id === state.queuedProject;
      pendingContract = viewing ? null : p.id;
      const cash = (n: number | null) => (n === null ? '—' : money(n, state.settings.locale));
      const rows = [
        [
          t('contractDuration'),
          quote.duration === null
            ? t('contractManual')
            : t('contractMinutes', { n: formatNumber(quote.duration / 60, state.settings.locale) }),
        ],
        [
          t('contractDeadline'),
          quote.deadline === null
            ? t('contractNoDeadline')
            : t('contractMinutes', { n: quote.deadline / 60 }),
        ],
        [t('contractEstimatedPayment'), cash(quote.payment)],
        [t('contractEstimatedProfit'), cash(quote.profit)],
      ];
      ui.modal(
        'contractReview',
        '<p>' +
          contractTerms[p.id].client +
          ' · ' +
          t(p.id) +
          '</p><dl class="statistics">' +
          rows
            .map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>')
            .join('') +
          '</dl><p class="fine-print">' +
          t('contractShortTerms') +
          '</p><button class="secondary-button" data-action="contractConditions" data-id="' +
          p.id +
          '">' +
          t('contractConditions') +
          '</button>' +
          (viewing
            ? ''
            : '<button class="secondary-button" data-close>' + t('cancel') + '</button>'),
        viewing ? 'understood' : 'accept',
        viewing ? undefined : 'contractConfirm',
      );
      return;
    }
    if (a.type === 'contractConfirm') {
      const id = pendingContract;
      pendingContract = null;
      if (id) changed = selectContract(state, id);
      ui.closeDialog();
    }
    if (a.type === 'offline') {
      state.pendingOffline = null;
      changed = true;
      ui.closeDialog();
    }
    if (a.type === 'setting') {
      const id = a.id as 'sfx' | 'music' | 'haptics' | 'reducedMotion';
      state.settings[id] = !state.settings[id];
      audio.music(state.settings.music);
      changed = true;
    }
    if (a.type === 'locale' && (a.id === 'pt-BR' || a.id === 'en-US')) {
      state.settings.locale = a.id;
      save();
      location.reload();
      return;
    }
    if (changed) {
      recordMissionProfit(state);
      save();
      ui.renderTab();
      if (a.type === 'offline' && totalOverdue(state) > 1e-7) ui.openRecovery();
      if (
        state.settings.sfx &&
        ['hireConfirm', 'upgrade', 'train', 'expandConfirm'].includes(a.type)
      )
        audio.play('upgrade');
      if (
        state.settings.haptics &&
        ['hireConfirm', 'upgrade', 'train', 'expandConfirm'].includes(a.type)
      )
        void vibrate(true);
    }
  }
  const ui = new GameUI(root, () => state, action);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'office-canvas',
    width: 720,
    height: 525,
    transparent: true,
    antialias: true,
    scene: [scene],
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, forceSetTimeOut: false },
    audio: { noAudio: true },
    render: { powerPreference: 'low-power', roundPixels: false },
  });
  const viewportObserver = new ResizeObserver(() => game.scale.refresh());
  viewportObserver.observe(document.querySelector('#office-canvas')!);
  const advance = () => {
    const now = performance.now();
    const delta = (now - last) / 1000;
    last = now;
    if (!active || disposed) return;
    const wasBankrupt = state.company.bankrupt;
    const result = tick(state, delta);
    autosave += delta;
    if (result.contracts) {
      analytics.track('contract_completed', { count: result.contracts });
      ui.refreshContracts();
      scene.feedback(`+${money(result.earned, state.settings.locale)}`, true);
      save();
    }
    if (autosave >= balance.autosaveSeconds) {
      autosave = 0;
      save();
    }
    if (!wasBankrupt && state.company.bankrupt) {
      save();
      ui.showBankruptcy(bankruptcyBody());
    }
    ui.update();
  };
  const interval = setInterval(advance, 100);
  const setActive = (next: boolean) => {
    if (active === next) return;
    if (!next) {
      advance();
      save();
      audio.pause();
      game.loop.sleep();
    } else {
      resume(state, Date.now());
      save();
      ui.renderTab();
      game.loop.wake();
      if (musicStarted) audio.music(state.settings.music);
      ui.showOffline();
    }
    active = next;
    last = performance.now();
  };
  const removeLifecycle = await observeLifecycle(setActive);
  const pagehide = () => setActive(false);
  const pageshow = () => setActive(!document.hidden);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  save();
  analytics.track('game_started');
  if (!state.clicks) analytics.track('tutorial_started');
  if (state.company.bankrupt) ui.showBankruptcy(bankruptcyBody());
  else if (loaded.issue) ui.modal('saveWarning', `<p>${t(loaded.issue)}</p>`);
  else ui.showOffline();
  let removeUpdates = () => {};
  if (import.meta.env.PROD)
    void installWebUpdates(() => state, save)
      .then((cleanup) => {
        if (disposed) cleanup();
        else removeUpdates = cleanup;
      })
      .catch(() => {
        /* Cached/native assets remain usable without update discovery. */
      });
  import.meta.hot?.dispose(() => {
    disposed = true;
    save();
    clearInterval(interval);
    viewportObserver.disconnect();
    removeLifecycle();
    audio.dispose();
    ui.dispose();
    removeUpdates();
    game.destroy(true);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
  });
}

// One writer per origin prevents a second tab from duplicating idle rewards or overwriting progress.
if (navigator.locks) {
  void navigator.locks.request('garage-empire-session', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      const root = document.querySelector('#app')!;
      root.innerHTML = `<div class="blocked-session"><h1>From Garage to Empire</h1><p>${translate('pt-BR', 'singleTab')}</p><button>${translate('pt-BR', 'retry')}</button></div>`;
      root.querySelector('button')!.addEventListener('click', () => location.reload());
      return;
    }
    await start();
    await new Promise<void>((resolve) => {
      import.meta.hot?.dispose(resolve);
    });
  });
} else void start();
