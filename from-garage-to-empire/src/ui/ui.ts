import { paginateContent, resetContentPages } from './content-pages';
import { currentStage } from '../core/project-stages';
import { contractPayment, contractTerms, isContractLate } from '../core/contracts';
import {
  createIcons,
  Building2,
  Users,
  TrendingUp,
  BriefcaseBusiness,
  Menu,
  ArrowUpRight,
  ArrowRight,
  Zap,
  Star,
  Coins,
  Coffee,
  Keyboard,
  Monitor,
  Laptop,
  Wifi,
  Plus,
  Check,
  Volume2,
  Music2,
  Vibrate,
  Leaf,
  Clock3,
  ShieldCheck,
  Code2,
  Sparkles,
  LockKeyhole,
  X,
  Sprout,
  CircleHelp,
} from 'lucide';
import type { GameState } from '../core/state';
import { balance, upgrades, type UpgradeId } from '../config/balance';
import {
  clickPower,
  focusMultiplier,
  workPerSecond,
  expenses,
  revenue,
  upgradeCost,
  contract,
} from '../core/economy';
import { translate, type TextKey } from '../i18n';
import { formatNumber, money } from '../utils/format';
import { renderMissions } from './missions';
import { renderContracts } from './contracts';
import { renderEmployee, renderHiring } from './team';
import { renderOperations, updateOperations } from './operations';
import { renderFinance, renderMovements, renderRecovery, updateFinance } from './finance';
import { businessMonthSeconds } from '../core/finance';
import { totalOverdue, recoveryStatus } from '../core/recovery';
import type { OperationId } from '../config/operations';
import type { InvestmentSize } from '../core/operations';
const icons = {
  Building2,
  Users,
  TrendingUp,
  BriefcaseBusiness,
  Menu,
  ArrowUpRight,
  ArrowRight,
  Zap,
  Star,
  Coins,
  Coffee,
  Keyboard,
  Monitor,
  Laptop,
  Wifi,
  Plus,
  Check,
  Volume2,
  Music2,
  Vibrate,
  Leaf,
  Clock3,
  ShieldCheck,
  Code2,
  Sparkles,
  LockKeyhole,
  X,
  Sprout,
  CircleHelp,
};
const icon = (name: string, cls = '') =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const renderIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.7 } });
type Tab = 'company' | 'team' | 'upgrades' | 'contracts' | 'missions' | 'more';
export type UIAction = {
  type:
    | 'camera'
    | 'operationInvest'
    | 'operationStart'
    | 'operationAutomate'
    | 'dismiss'
    | 'dismissConfirm'
    | 'mission'
    | 'work'
    | 'hire'
    | 'hireConfirm'
    | 'expand'
    | 'expandConfirm'
    | 'takeLoan'
    | 'loanConfirm'
    | 'repayLoan'
    | 'downsize'
    | 'downsizeConfirm'
    | 'renegotiateRent'
    | 'renegotiateConfirm'
    | 'sellUpgrade'
    | 'sellConfirm'
    | 'upgrade'
    | 'train'
    | 'allocation'
    | 'allocationConfirm'
    | 'stages'
    | 'contract'
    | 'contractConfirm'
    | 'contractConditions'
    | 'setting'
    | 'locale'
    | 'offline'
    | 'continueCompany'
    | 'history'
    | 'historyPrev'
    | 'historyNext'
    | 'historyDetails'
    | 'restart'
    | 'restartConfirm';
  id?: string;
};
export class GameUI {
  private missionMarkup = '';
  private contractSignature = '';
  private page = 0;
  private employeeDetails = new Set<number>();
  private teamView: 'current' | 'hire' = 'current';
  private businessView: 'operations' | 'contracts' = 'operations';
  private moreView: 'finance' | 'recovery' | 'movements' | 'settings' = 'finance';
  private financeSignature = '';
  private financeMonth = 0;
  private operationDetails = new Set<OperationId>();
  private investmentSize: InvestmentSize = 1;
  private tab: Tab = 'company';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private saveOK = true;
  private lastFocus?: HTMLElement;
  private dialog: HTMLDialogElement;
  private t: (key: TextKey, params?: Record<string, string | number>) => string;
  constructor(
    private root: HTMLElement,
    private getState: () => GameState,
    private action: (action: UIAction) => void,
  ) {
    this.root.dataset.tab = this.tab;
    this.t = (key, params = {}) => translate(this.getState().settings.locale, key, params);
    this.root.innerHTML = `<div class="app-shell">
      <header class="topbar"><a class="wordmark" href="#" data-tab="company" aria-label="From Garage to Empire"><span class="brand-icon">${icon('code-2')}</span><span>GARAGE<span class="brand-second">TO EMPIRE<span class="brand-dot">.</span></span></span></a><span class="tagline">${this.t('tagline')}</span><span class="edition">${this.t('buildLabel')}</span></header>
      <main><section class="page-heading"><div><div class="eyebrow" id="chapter"></div><h1 id="office-title"></h1><p id="office-description"></p></div><div class="level-badge">${icon('sparkles')}<span id="level"></span></div></section>
      <section class="hud" aria-label="${this.t('balance')}"><div class="wallet"><span class="metric-icon gold">${icon('coins')}</span><div><span class="small-label">${this.t('balance')}</span><strong id="money"></strong></div></div><div class="income"><span class="metric-icon mint">${icon('trending-up')}</span><div><strong id="profit"></strong><span class="small-label">${this.t('profit')}</span></div></div><div class="reputation"><span class="metric-icon peach">${icon('star')}</span><div><strong id="reputation"></strong><span class="small-label">${this.t('reputation')}</span></div></div></section>
      <div class="workspace"><section class="scene-panel"><div class="scene-caption"><span class="eyebrow"><span class="live-dot"></span>${this.t('live')}</span><button class="camera-button" data-action="camera">${this.t('wideView')}</button><span class="scene-capacity">${icon('users')}<span id="capacity"></span></span></div><div id="office-canvas" role="img" aria-label="${this.t('canvasLabel')}"></div><div class="office-footer"><span class="location">${icon('building-2')}<span id="office-name"></span><span class="stage-chip" id="office-stage"></span></span><span class="working-label"><span class="live-dot"></span>${this.t('working')}</span></div><div class="tutorial"><span class="tutorial-icon">${icon('circle-help')}</span><div><span class="eyebrow">${this.t('tutorialLabel')}</span><p id="tutorial"></p></div><span class="tutorial-steps" id="tutorial-steps"></span></div></section>
      <aside class="action-column"><section class="project-card"><div class="card-top"><span class="eyebrow">${this.t('currentProject')}</span><span class="contract-icon">${icon('code-2')}</span></div><h2 id="project-name"></h2><p class="muted" id="project-description"></p><div class="project-rewards"><span class="reward-money">${icon('coins')}<b id="project-pay"></b></span><span>${icon('star')}<span id="project-rep"></span></span><span id="project-xp"></span></div><div class="progress-label"><button id="project-progress" class="stage-label" data-action="stages"></button><strong id="project-percent"></strong></div><div class="progress-track" role="progressbar" aria-label="${this.t('currentProject')}" aria-valuemin="0" aria-valuemax="100" id="project-bar"><span id="project-fill"></span></div><div class="focus-row"><span>${icon('zap')}<b id="focus-label"></b></span><div class="focus-track"><span id="focus-fill"></span></div><strong id="focus-multiplier"></strong></div><button class="work-button" data-action="work">${icon('code-2')}<span><strong id="work-label">${this.t('work')}</strong><small id="click-power"></small></span><span class="work-arrow">${icon('arrow-up-right')}</span></button><p class="focus-hint" id="focus-hint"></p><p class="queue-notice" id="queue-notice" hidden></p></section>
      <section class="goal-card"><div class="eyebrow">${icon('sprout')}${this.t('nextGoal')}</div><h3 id="goal-title"></h3><p id="goal-description"></p><div class="goal-progress"><span id="goal-amount"></span><span id="goal-percent"></span></div><div class="progress-track slim"><span id="goal-fill"></span></div><button class="expand-button" data-action="expand"><span>${this.t('expand')}</span>${icon('arrow-right')}</button></section></aside></div>
      <section class="tab-panel" id="tab-panel" hidden></section>
      <nav class="bottom-nav" aria-label="${this.t('company')}">${(['company', 'team', 'upgrades', 'contracts', 'missions', 'more'] as const).map((tab, i) => `<button data-tab="${tab}" class="nav-button ${tab === 'company' ? 'active' : ''}" aria-current="${tab === 'company' ? 'page' : 'false'}">${icon(['building-2', 'users', 'trending-up', 'briefcase-business', 'star', 'menu'][i]!)}<span>${this.t(tab)}</span><span class="nav-dot"></span></button>`).join('')}</nav>
      <footer class="save-footer">${icon('shield-check')}<span id="save-status">${this.t('saved')}</span><span class="footer-decor">•</span><span class="footer-note">${this.t('offlineReady')}</span></footer></main>
      <div class="toast" role="status" id="toast" hidden></div><dialog id="game-dialog" aria-labelledby="dialog-title"></dialog></div>`;
    this.dialog = this.root.querySelector('dialog')!;
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
    this.dialog.addEventListener('close', () => this.lastFocus?.focus());
    this.dialog.addEventListener('cancel', (event) => {
      if (this.getState().pendingOffline) {
        event.preventDefault();
        this.action({ type: 'offline' });
        this.dialog.close();
      }
    });
    this.update();
    renderIcons();
  }
  private onClick = (event: Event): void => {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      'button[data-tab], a[data-tab], [data-action], [data-close], [data-page], [data-team-view], [data-employee-view], [data-business-view], [data-operation-view], [data-investment-size], [data-more-view]',
    );
    if (!button || button.hasAttribute('disabled')) return;
    if (button.dataset.moreView) {
      this.moreView = button.dataset.moreView as 'finance' | 'recovery' | 'movements' | 'settings';
      this.page = 0;
      this.renderTab();
      return;
    }
    if (button.dataset.businessView) {
      this.businessView = button.dataset.businessView as 'operations' | 'contracts';
      this.page = 0;
      this.renderTab();
      return;
    }
    if (button.dataset.operationView) {
      const id = button.dataset.id as OperationId;
      if (button.dataset.operationView === 'invest') this.operationDetails.add(id);
      else this.operationDetails.delete(id);
      this.renderTab();
      return;
    }
    if (button.dataset.investmentSize) {
      this.investmentSize =
        button.dataset.investmentSize === 'milestone'
          ? 'milestone'
          : (Number(button.dataset.investmentSize) as 1 | 10);
      this.renderTab();
      return;
    }
    if (button.dataset.employeeView) {
      const id = Number(button.dataset.employeeId);
      if (button.dataset.employeeView === 'training') this.employeeDetails.add(id);
      else this.employeeDetails.delete(id);
      this.renderTab();
      return;
    }
    if (button.dataset.teamView) {
      this.teamView = button.dataset.teamView as 'current' | 'hire';
      this.page = 0;
      this.renderTab();
      return;
    }
    if (button.dataset.page) {
      this.page += Number(button.dataset.page);
      this.paginate();
      return;
    }
    if (button.dataset.tab) {
      this.page = 0;
      event.preventDefault();
      this.tab = button.dataset.tab as Tab;
      this.renderTab();
      return;
    }
    if ('close' in button.dataset) {
      this.dialog.close();
      return;
    }
    if (button.dataset.action)
      this.action({ type: button.dataset.action as UIAction['type'], id: button.dataset.id });
  };
  private onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.setting) this.action({ type: 'setting', id: input.dataset.setting });
    if (input.id === 'locale') this.action({ type: 'locale', id: input.value });
  };
  private text(id: string, value: string): void {
    const el = this.root.querySelector(`#${id}`);
    if (el && el.textContent !== value) el.textContent = value;
  }
  update(): void {
    if (this.tab === 'missions') {
      const markup = renderMissions(this.getState());
      if (markup !== this.missionMarkup) {
        const panel = this.root.querySelector('#missions-panel')!;
        const previous = Array.from(panel.querySelectorAll('.mission-row'));
        const template = document.createElement('template');
        template.innerHTML = markup;
        const next = Array.from(template.content.querySelectorAll('.mission-row'));
        if (previous.length && previous.length === next.length) {
          previous.forEach((row, index) => {
            const fresh = next[index]!;
            row.classList.toggle('ready', fresh.classList.contains('ready'));
            row.querySelector('.mission-heading span')!.textContent =
              fresh.querySelector('.mission-heading span')!.textContent;
            (row.querySelector('.career-track span') as HTMLElement).style.width = (
              fresh.querySelector('.career-track span') as HTMLElement
            ).style.width;
            const button = row.querySelector('button[data-action="mission"]') as HTMLButtonElement;
            const freshButton = fresh.querySelector('button') as HTMLButtonElement;
            button.textContent = freshButton.textContent;
            button.disabled = freshButton.disabled;
          });
        } else {
          panel.innerHTML = markup;
          this.paginate();
        }
        this.missionMarkup = markup;
      }
    }
    const s = this.getState(),
      p = contract(s),
      locale = s.settings.locale;
    const fmt = (n: number) => formatNumber(n, locale),
      cash = (n: number) => money(n, locale);
    this.text('chapter', this.t('chapter', { n: s.office + 1 }));
    this.text('office-title', this.t(`office${s.office}` as TextKey));
    this.text('office-description', this.t(`officeDetail${s.office}` as TextKey));
    this.root.dataset.office = String(s.office);
    const overdue = totalOverdue(s);
    const status = recoveryStatus(s, (revenue(s) - expenses(s)) * businessMonthSeconds);
    this.root.dataset.crisis = status;
    this.root.dataset.bankrupt = String(s.company.bankrupt);
    this.text('level', this.t('level', { n: 1 + Math.floor(Math.sqrt(s.xp / 20)) }));
    this.text('money', cash(s.money));
    this.text('profit', cash((revenue(s) - expenses(s)) * businessMonthSeconds));
    this.text('reputation', fmt(s.reputation));
    this.text('office-name', this.t(`officeName${s.office}` as TextKey));
    this.text('office-stage', `0${s.office + 1}`);
    this.text(
      'capacity',
      this.t('teamCount', { n: s.employees.length + 1, max: balance.maxEmployees[s.office]! + 1 }),
    );
    this.text('project-name', this.t(p.id));
    const deadline =
      s.contractBook.active?.project === s.project ? s.contractBook.active.deadline : null;
    this.text(
      'project-description',
      contractTerms[p.id].client +
        ' · ' +
        (deadline === null
          ? this.t('contractNoDeadline')
          : isContractLate(s)
            ? this.t('contractLate')
            : this.t('contractSecondsLeft', {
                n: Math.max(0, Math.ceil(deadline - s.financial.elapsed)),
              })),
    );
    this.text('project-pay', cash(contractPayment(s)));
    this.text('project-rep', `+${p.reputation}`);
    this.text('project-xp', `+${p.xp} XP`);
    const stage = currentStage(s);
    this.text(
      'project-progress',
      this.t('stageLabel', { n: stage.index + 1, phase: this.t(stage.id) }),
    );
    this.text('project-percent', Math.floor(stage.percent) + '%');
    this.text(
      'work-label',
      this.t(
        stage.id === 'development'
          ? 'stageDevelop'
          : stage.id === 'testing'
            ? 'stageTest'
            : 'stageDeliver',
      ),
    );
    this.root.querySelector<HTMLElement>('#project-fill')!.style.width = stage.percent + '%';
    const stageBar = this.root.querySelector<HTMLElement>('#project-bar')!;
    stageBar.dataset.stage = stage.id;
    stageBar.setAttribute('aria-label', this.t(stage.id));
    stageBar.setAttribute('aria-valuenow', String(Math.floor(stage.percent)));
    stageBar.setAttribute(
      'aria-valuetext',
      this.t('stageAccessible', {
        phase: this.t(stage.id),
        n: Math.floor(stage.percent),
        total: Math.floor((s.progress / p.work) * 100),
      }),
    );
    this.text('focus-label', this.t(s.deepWork > 0 ? 'deepWork' : 'focus'));
    this.text('focus-multiplier', `×${focusMultiplier(s).toFixed(1)}`);
    this.root.querySelector<HTMLElement>('#focus-fill')!.style.width =
      `${s.deepWork > 0 ? s.deepWork * 10 : s.focus}%`;
    this.root.querySelector('.project-card')!.classList.toggle('deep-work', s.deepWork > 0);
    this.text('click-power', this.t('perTap', { n: fmt(clickPower(s) * focusMultiplier(s)) }));
    this.text('focus-hint', this.t(s.deepWork > 0 ? 'deepHint' : 'focusHint'));
    const queueNotice = this.root.querySelector<HTMLElement>('#queue-notice')!;
    queueNotice.hidden = !s.queuedProject && !s.legacyContract;
    this.text(
      'queue-notice',
      s.legacyContract
        ? this.t('legacyProject')
        : s.queuedProject
          ? this.t('nextContract', { project: this.t(s.queuedProject) })
          : '',
    );
    const goal = balance.officeCosts[s.office + 1];
    this.text(
      'goal-title',
      this.t(
        s.company.bankrupt
          ? 'bankruptcyTitle'
          : overdue > 1e-7
            ? 'recovery_crisis'
            : (`goal${s.office}` as TextKey),
      ),
    );
    this.text(
      'goal-description',
      this.t(
        s.company.bankrupt
          ? 'bankruptcyGoalHint'
          : overdue > 1e-7
            ? 'recoveryCrisisHint'
            : (`goalDesc${s.office}` as TextKey),
      ),
    );
    this.text(
      'goal-amount',
      overdue > 1e-7
        ? this.t('recoveryDueAmount', { amount: cash(overdue) })
        : goal
          ? `${cash(s.money)} / ${cash(goal)}`
          : this.t('maxOffice'),
    );
    this.text(
      'goal-percent',
      overdue > 1e-7 ? '' : goal ? `${Math.min(100, Math.floor((s.money / goal) * 100))}%` : '',
    );
    this.root.querySelector<HTMLElement>('#goal-fill')!.style.width =
      `${overdue > 1e-7 ? 0 : goal ? Math.min(100, (s.money / goal) * 100) : 100}%`;
    const expand = this.root.querySelector<HTMLButtonElement>('[data-action="expand"]')!;
    expand.disabled = !goal || s.money < goal;
    if (s.office === 2 || overdue > 1e-7) expand.disabled = false;
    if (s.company.bankrupt) expand.disabled = false;
    else if (s.company.pausedForReview) expand.disabled = true;
    this.root.querySelector<HTMLButtonElement>('[data-action="work"]')!.disabled =
      s.company.bankrupt || s.company.pausedForReview;
    expand.querySelector('span')!.textContent = this.t(
      s.company.bankrupt
        ? 'bankruptcyArchive'
        : overdue > 1e-7
          ? 'recoveryOpen'
          : s.office === 2
            ? 'openOperations'
            : 'expand',
    );
    const step = s.employees.length ? 3 : s.upgrades.coffee ? 2 : s.completed ? 1 : 0;
    this.text('tutorial', this.t(`tutorial${step}` as TextKey));
    this.text('tutorial-steps', `${step + 1}/4`);
    this.text('save-status', this.t(this.saveOK ? 'saved' : 'saveError'));
    this.root.querySelectorAll<HTMLButtonElement>('[data-cost]').forEach((button) => {
      button.disabled = s.money < Number(button.dataset.cost) || button.dataset.locked === 'true';
    });
    if (s.company.bankrupt || s.company.pausedForReview) {
      const allowed = s.company.bankrupt
        ? [
            'expand',
            'history',
            'historyPrev',
            'historyNext',
            'historyDetails',
            'restart',
            'restartConfirm',
          ]
        : [
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
          ];
      this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
        if (!allowed.includes(button.dataset.action ?? '')) button.disabled = true;
      });
    }
    if (this.tab === 'contracts' && this.businessView === 'operations')
      updateOperations(this.root, s);
    if (this.tab === 'more' && this.moreView !== 'settings') {
      const signature = s.financial.entries
        .map((entry) => `${entry.period}:${entry.kind}`)
        .join('|');
      const month = Math.floor(s.financial.elapsed / businessMonthSeconds);
      if (
        (this.moreView === 'movements' && signature !== this.financeSignature) ||
        ((this.moreView === 'finance' || this.moreView === 'recovery') &&
          month !== this.financeMonth)
      ) {
        this.renderTab();
        return;
      }
      updateFinance(this.root, s);
    }
    for (const [id, value] of Object.entries({
      totalEarned: cash(s.totalEarned),
      totalClicks: fmt(s.clicks),
      completed: fmt(s.completed),
      playTime: this.t('minutes', { n: Math.floor(s.playSeconds / 60) }),
      revenue: cash(revenue(s)),
      expenses: cash(expenses(s)),
    }))
      this.text(`stat-${id}`, value);
    this.root.classList.toggle('reduced-motion', s.settings.reducedMotion);
  }
  renderTab(): void {
    const s = this.getState(),
      t = this.t,
      cash = (n: number) => money(n, s.settings.locale),
      fmt = (n: number) => formatNumber(n, s.settings.locale);
    const panel = this.root.querySelector<HTMLElement>('#tab-panel')!;
    this.root.querySelector<HTMLElement>('.workspace')!.hidden = this.tab !== 'company';
    panel.hidden = this.tab === 'company';
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === this.tab);
      button.setAttribute('aria-current', button.dataset.tab === this.tab ? 'page' : 'false');
    });
    const header = (title: TextKey, subtitle?: TextKey) =>
      `<div class="panel-heading"><span class="eyebrow">${t(this.tab)}</span><h2>${t(title)}</h2>${subtitle ? `<p>${t(subtitle)}</p>` : ''}</div>`;
    panel.dataset.view = this.tab;
    this.root.dataset.tab = this.tab;
    if (this.tab === 'team') {
      const current = this.teamView === 'current';
      panel.innerHTML = `${header('teamTitle')}<div class="team-switch" role="group" aria-label="${t('team')}"><button data-team-view="current" aria-pressed="${current}">${t('currentTeam')} (${s.employees.length}/${balance.maxEmployees[s.office]})</button><button data-team-view="hire" aria-pressed="${!current}">${t('recruit')}</button></div><div class="item-grid">${current ? (s.employees.length ? s.employees.map((e) => renderEmployee(s, e, this.employeeDetails.has(e.id))).join('') : '<article class="empty-card"><h3>' + t('emptyTeam') + '</h3><p>' + t('emptyTeamHint') + '</p><button class="secondary-button" data-team-view="hire">' + t('recruit') + '</button></article>') : renderHiring(s)}</div>`;
    }
    if (this.tab === 'upgrades')
      panel.innerHTML = `${header('upgradesTitle', 'upgradesSubtitle')}<div class="item-grid">${upgrades
        .map((u, i) => {
          const next = structuredClone(s);
          next.upgrades[u.id] = Math.min(balance.maxUpgradeLevel, next.upgrades[u.id] + 1);
          return `<article class="item-card"><div class="item-top"><span class="upgrade-icon">${icon(['coffee', 'keyboard', 'monitor', 'laptop', 'wifi'][i]!)}</span><span><h3>${t(u.id)}</h3><p>${t('employeeLevel', { n: s.upgrades[u.id] })} / ${balance.maxUpgradeLevel}</p></span></div><p class="flavor">${t(`${u.id}Desc`)}</p><div class="upgrade-effect">${icon('trending-up')}<span>${t('beforeAfter', { before: fmt(clickPower(s)), after: fmt(clickPower(next)) })}${u.multiplier ? `<br>${t('passiveAfter', { before: fmt(workPerSecond(s)), after: fmt(workPerSecond(next)) })}` : ''}</span></div><button class="secondary-button" data-action="upgrade" data-id="${u.id}" data-cost="${upgradeCost(s, u.id as UpgradeId)}" data-locked="${s.upgrades[u.id] >= balance.maxUpgradeLevel}">${t(s.upgrades[u.id] >= balance.maxUpgradeLevel ? 'maxed' : 'buy')}<b>${cash(upgradeCost(s, u.id))}</b></button></article>`;
        })
        .join('')}</div>`;
    if (this.tab === 'contracts') {
      const operating = this.businessView === 'operations';
      panel.dataset.view = operating ? 'operations' : 'contracts';
      panel.innerHTML = `${header('businessesTitle')}<div class="team-switch business-switch" role="group" aria-label="${t('businessesTitle')}"><button data-business-view="contracts" aria-pressed="${!operating}">${t('agencyContracts')}</button><button data-business-view="operations" aria-pressed="${operating}">${t('operationPortfolio')}</button></div>${operating ? renderOperations(s, this.operationDetails, this.investmentSize) : renderContracts(s)}`;
    }
    if (this.tab === 'missions') {
      panel.innerHTML = '<section class="missions-panel" id="missions-panel"></section>';
      this.missionMarkup = '';
    }
    if (this.tab === 'more') {
      panel.dataset.view = 'finance';
      panel.innerHTML = `${header('moreTitle')}<div class="team-switch finance-switch" role="group" aria-label="${t('moreTitle')}"><button data-more-view="finance" aria-pressed="${this.moreView === 'finance'}">${t('finance')}</button><button data-more-view="recovery" aria-pressed="${this.moreView === 'recovery'}">${t('recoveryTab')}</button><button data-more-view="movements" aria-pressed="${this.moreView === 'movements'}">${t('financeMovements')}</button><button data-more-view="settings" aria-pressed="${this.moreView === 'settings'}">${t('settings')}</button></div>${this.moreView === 'finance' ? renderFinance(s) : this.moreView === 'recovery' ? renderRecovery(s) : this.moreView === 'movements' ? renderMovements(s) : `<div class="item-grid settings-grid"><article class="item-card"><h3>${t('statistics')}</h3><dl class="statistics">${(['totalEarned', 'totalClicks', 'completed', 'playTime', 'revenue', 'expenses'] as const).map((key) => `<div><dt>${t(key)}</dt><dd id="stat-${key}"></dd></div>`).join('')}</dl><p class="fine-print">${t('profitHint')}</p></article><article class="item-card"><h3>${t('settings')}</h3><div class="settings">${(['sfx', 'music', 'haptics', 'reducedMotion'] as const).map((key, i) => `<label>${icon(['volume-2', 'music-2', 'vibrate', 'leaf'][i]!)}<span>${t(key)}</span><input type="checkbox" role="switch" data-setting="${key}" ${s.settings[key] ? 'checked' : ''}></label>`).join('')}<label><span>${t('language')}</span><select id="locale"><option value="pt-BR" ${s.settings.locale === 'pt-BR' ? 'selected' : ''}>Português</option><option value="en-US" ${s.settings.locale === 'en-US' ? 'selected' : ''}>English</option></select></label></div><p class="fine-print">${t('privacy')}</p></article><article class="item-card"><h3>${t('careerHistory')}</h3><p>${t('careerCount', { n: s.career.reports.length })}</p><button class="secondary-button" data-action="history">${t('careerOpen')}</button></article></div>`}`;
      if (this.moreView === 'settings') {
        const records = s.career.records;
        panel
          .querySelector('.settings-grid .item-card:last-child button')
          ?.insertAdjacentHTML(
            'beforebegin',
            `<h4>${t('careerRecords')}</h4><dl class="statistics"><div><dt>${t('careerRevenue')}</dt><dd>${cash(records.totalEarned)}</dd></div><div><dt>${t('careerCashPeak')}</dt><dd>${cash(records.maxCash)}</dd></div><div><dt>${t('careerContracts')}</dt><dd>${records.completed}</dd></div></dl>`,
          );
      }
      this.financeSignature = s.financial.entries
        .map((entry) => `${entry.period}:${entry.kind}`)
        .join('|');
      this.financeMonth = Math.floor(s.financial.elapsed / businessMonthSeconds);
    }
    this.update();
    renderIcons();
    this.paginate();
    if (this.tab === 'company') window.dispatchEvent(new Event('resize'));
  }
  refreshContracts(): void {
    if (this.tab !== 'contracts' || this.businessView !== 'contracts') return;
    const s = this.getState();
    const signature = JSON.stringify([
      s.project,
      s.queuedProject,
      s.legacyContract,
      Math.min(45, s.reputation),
      Object.values(s.contractHistory).map((count) => Math.min(3, count)),
    ]);
    if (signature !== this.contractSignature) {
      this.contractSignature = signature;
      this.renderTab();
      return;
    }
    this.root.querySelectorAll<HTMLElement>('[data-contract-deliveries]').forEach((el) => {
      el.textContent = this.t('deliveriesCount', {
        n: s.contractHistory[el.dataset.contractDeliveries as keyof typeof s.contractHistory],
      });
    });
  }
  private paginate(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-panel')!;
    const list = panel.querySelector<HTMLElement>(
      '.item-grid, .contract-route, .mission-list, .finance-list',
    );
    if (!list) return;
    const cards = Array.from(list.children) as HTMLElement[];
    cards.forEach((card) =>
      resetContentPages(card.querySelector<HTMLElement>('.milestone-content') ?? card),
    );
    const bounds = list.getBoundingClientRect();
    const columns = bounds.width >= 640 && window.innerHeight > 500 ? 2 : 1;
    const mission = list.classList.contains('mission-list');
    const ledger = list.classList.contains('finance-list');
    const available = Math.max(120, panel.getBoundingClientRect().bottom - bounds.top - 52);
    const rows = mission
      ? Math.max(1, Math.min(2, Math.floor(available / 165)))
      : ledger
        ? Math.max(1, Math.min(8, Math.floor(available / 62)))
        : 1;
    const size = ledger ? rows : columns * rows;
    list.style.gridTemplateColumns = 'repeat(' + (ledger ? 1 : columns) + ', minmax(0, 1fr))';
    const pages = Math.max(1, Math.ceil(cards.length / size));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    cards.forEach((card, index) => {
      card.hidden = Math.floor(index / size) !== this.page;
    });
    let pager = panel.querySelector<HTMLElement>('.panel-pager');
    if (!pager) {
      pager = document.createElement('div');
      pager.className = 'panel-pager';
      panel.append(pager);
    }
    pager.hidden = pages <= 1;
    pager.innerHTML =
      '<button data-page="-1" ' +
      (this.page === 0 ? 'disabled' : '') +
      '>' +
      this.t('previousPage') +
      '</button><span>' +
      (this.page + 1) +
      ' / ' +
      pages +
      '</span><button data-page="1" ' +
      (this.page === pages - 1 ? 'disabled' : '') +
      '>' +
      this.t('nextPage') +
      '</button>';
    const labels = { previous: this.t('previousPage'), next: this.t('nextPage') };
    cards
      .filter((card) => !card.hidden)
      .forEach((card) => {
        const content = card.querySelector<HTMLElement>('.milestone-content') ?? card;
        paginateContent(
          content,
          (Math.min(available + 8, list.getBoundingClientRect().height) - (rows - 1) * 12) / rows -
            (content === card ? 0 : 28),
          labels,
        );
      });
  }
  private onResize = (): void => {
    this.paginate();
    this.paginateDialog();
  };
  openOperations(): void {
    this.tab = 'contracts';
    this.businessView = 'operations';
    this.page = 0;
    this.renderTab();
  }
  openRecovery(): void {
    this.tab = 'more';
    this.moreView = 'recovery';
    this.page = 0;
    this.renderTab();
  }
  resetToCompany(): void {
    this.tab = 'company';
    this.moreView = 'finance';
    this.page = 0;
    this.closeDialog();
    this.renderTab();
  }
  showBankruptcy(body: string): void {
    this.modal('bankruptcyTitle', body, 'bankruptcyArchive', 'restart');
  }
  saved(ok: boolean): void {
    this.saveOK = ok;
    this.update();
  }
  toast(message: string): void {
    const el = this.root.querySelector<HTMLElement>('#toast')!;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3000);
  }
  modal(title: TextKey, body: string, button: TextKey = 'understood', action?: string): void {
    this.lastFocus = document.activeElement as HTMLElement;
    this.dialog.innerHTML = `<span class="modal-symbol">${icon('sparkles')}</span><h2 id="dialog-title">${this.t(title)}</h2>${body}<button class="modal-button" ${action ? `data-action="${action}"` : 'data-close'}>${this.t(button)}${icon('arrow-right')}</button>`;
    const content = document.createElement('div');
    content.className = 'dialog-content';
    content.append(...Array.from(this.dialog.childNodes));
    this.dialog.append(content);
    if (!this.dialog.open) this.dialog.showModal();
    renderIcons();
    this.paginateDialog();
  }
  private paginateDialog(): void {
    if (!this.dialog.open) return;
    const content = this.dialog.querySelector<HTMLElement>('.dialog-content');
    if (content)
      paginateContent(content, (window.visualViewport?.height ?? window.innerHeight) - 48, {
        previous: this.t('previousPage'),
        next: this.t('nextPage'),
      });
  }
  showOffline(): void {
    const o = this.getState().pendingOffline;
    if (!o) return;
    const operations = Math.min(o.operationEarned, o.earned);
    this.modal(
      'welcomeBack',
      `<p>${this.t('offlineIntro')}</p><span class="offline-away">${this.t('away', { n: Math.floor(o.seconds / 60) })}</span><dl class="statistics"><div><dt>${this.t('offlineGross')}</dt><dd>${money(o.earned - operations, this.getState().settings.locale)}</dd></div>${operations ? `<div><dt>${this.t('offlineOperations')}</dt><dd>${money(operations, this.getState().settings.locale)}</dd></div>` : ''}<div><dt>${this.t('offlineCosts')}</dt><dd>−${money(o.costs, this.getState().settings.locale)}</dd></div>${totalOverdue(this.getState()) > 1e-7 ? `<div><dt>${this.t('recoveryOverdue')}</dt><dd>${money(totalOverdue(this.getState()), this.getState().settings.locale)}</dd></div>` : ''}</dl><div class="offline-total"><span>${this.t('offlineNet')}</span><strong>${money(o.earned - o.costs, this.getState().settings.locale)}</strong></div><p class="fine-print">${this.getState().company.pausedForReview ? this.t('bankruptcyReviewHint') : totalOverdue(this.getState()) > 1e-7 ? this.t('recoveryOfflineHint') : this.t('offlineCap')}</p>`,
      'collect',
      'offline',
    );
  }
  closeDialog(): void {
    if (this.dialog.open) this.dialog.close();
  }
  dispose(): void {
    clearTimeout(this.toastTimer);
    window.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('change', this.onChange);
  }
}
