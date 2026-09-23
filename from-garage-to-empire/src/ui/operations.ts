import { operations, operationBalance, type OperationId } from '../config/operations';
import {
  investmentQuote,
  canLaunchOperation,
  operationRequirements,
  operationPayout,
  operationMultiplier,
  nextOperationMilestone,
  type InvestmentSize,
} from '../core/operations';
import type { GameState } from '../core/state';
import { translate, type TextKey } from '../i18n';
import { money, formatNumber } from '../utils/format';

export function renderOperations(
  s: GameState,
  details: Set<OperationId>,
  size: InvestmentSize,
): string {
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  const cash = (n: number) => money(n, s.settings.locale);
  return `<div class="item-grid operation-grid">${operations
    .map((op, index) => {
      const owned = s.operations[op.id];
      const unlocked = canLaunchOperation(s, op.id);
      const investing = details.has(op.id) && owned.level > 0;
      const quote = investmentQuote(s, op.id, size);
      const next = nextOperationMilestone(owned.level);
      const payout = operationPayout(op.id, owned.level || 1);
      const heading = `<header class="operation-header"><span class="operation-emblem" aria-hidden="true">${['WWW', 'MENU', 'SHOP', 'APP', 'SaaS'][index]}</span><div><h3>${t(`operation_${op.id}`)}</h3><span>${owned.level ? t('operationLevel', { n: owned.level, max: operationBalance.maxLevel }) : t(unlocked ? 'operationAvailable' : 'lockedContract')}</span></div><b class="operation-boost">×${operationMultiplier(owned.level)}</b></header>`;
      if (!unlocked)
        return `<article class="operation-card operation-locked">${heading}<p class="operation-description">${t(`operation_${op.id}Desc`)}</p><ul class="operation-requirements">${operationRequirements(
          s,
          op.id,
        )
          .map((r) => {
            const label =
              r.kind === 'deliveries'
                ? t('needDeliveries', { n: r.target, project: t(op.project) })
                : r.kind === 'office'
                  ? t('needOffice', { office: t(`officeName${r.target}` as TextKey) })
                  : r.kind === 'developers'
                    ? t('needEmployees', { n: r.target, level: op.developerLevel })
                    : t('operationPortfolioGate', { n: r.target });
            return `<li class="${r.current >= r.target ? 'met' : ''}"><span>${r.current >= r.target ? '✓' : '○'}</span><span>${label}</span><b>${Math.min(r.current, r.target)}/${r.target}</b></li>`;
          })
          .join(
            '',
          )}</ul><div class="operation-unlock-price">${t('operationLaunch')}<b>${cash(op.cost)}</b></div></article>`;
      const tabs = owned.level
        ? `<div class="operation-tabs" role="group" aria-label="${t(`operation_${op.id}`)}"><button data-operation-view="operate" data-id="${op.id}" aria-pressed="${!investing}">${t('operationOperate')}</button><button data-operation-view="invest" data-id="${op.id}" aria-pressed="${investing}">${t('operationInvest')}</button></div>`
        : '';
      const body = investing
        ? `<div class="operation-investment">
      <div class="investment-sizes" role="group" aria-label="${t('operationBuySize')}">${([1, 10, 'milestone'] as const).map((n) => `<button data-investment-size="${n}" aria-pressed="${size === n}">${n === 'milestone' ? t('operationNextMilestone') : `+${n}`}</button>`).join('')}</div>
      <div class="operation-metrics"><div><span>${t('operationLevelShort')}</span><strong>${owned.level} → ${quote.level}</strong></div><div><span>${t('operationGain')}</span><strong>+${cash(quote.revenueGain)}/s</strong></div></div>
      <p class="operation-milestone">${next ? t('operationMilestoneHint', { level: next }) : t('operationComplete')}</p>
      <button class="secondary-button" data-action="operationInvest" data-id="${op.id}:${size}" data-cost="${quote.cost}" data-locked="${!quote.levels}"><span>${quote.levels ? t('operationBuyLevels', { n: quote.levels }) : t('maxed')}</span><b>${cash(quote.cost)}</b></button>
      <p class="operation-footnote">${t(owned.automated ? 'operationNextCycle' : 'operationManualRate')}</p></div>`
        : `
      ${!owned.level ? `<p class="operation-description">${t(`operation_${op.id}Desc`)}</p>` : ''}
      <div class="operation-metrics"><div><span>${t('operationCyclePayout')}</span><strong data-operation-payout="${op.id}">${cash(owned.running ? owned.cyclePayout : payout)}</strong></div><div><span>${t('operationCycleTime')}</span><strong>${t('operationSeconds', { n: op.cycle })}</strong></div></div>
      ${
        owned.level
          ? `<div class="operation-cycle"><div><span>${t(owned.automated ? 'operationAutomatic' : 'operationManual')}</span><b data-operation-status="${op.id}"></b></div><div class="operation-track" role="progressbar" aria-label="${t(`operation_${op.id}`)}" aria-valuemin="0" aria-valuemax="100" data-operation-progress="${op.id}"><span></span></div></div>
      ${owned.automated ? `<div class="operation-offline"><b>${t('operationOfflineActive')}</b><span>${t('operationAutomaticRate', { n: cash(payout / op.cycle) })}</span></div>` : `<button class="secondary-button" data-action="operationStart" data-id="${op.id}">${t('operationStart')}</button><button class="operation-automate" data-action="operationAutomate" data-id="${op.id}" data-cost="${op.automation}"><span>${t('operationAutomate')}</span><b>${cash(op.automation)}</b></button>`}
      <p class="operation-footnote">${t(owned.automated ? 'operationOfflineHint' : 'operationAutomationHint')}</p>`
          : `<button class="secondary-button" data-action="operationInvest" data-id="${op.id}:1" data-cost="${op.cost}">${t('operationLaunch')}<b>${cash(op.cost)}</b></button><p class="operation-footnote">${t('operationLaunchHint')}</p>`
      }`;
      return `<article class="operation-card" data-operation="${op.id}">${heading}${tabs}${body}</article>`;
    })
    .join('')}</div>`;
}

export function updateOperations(root: HTMLElement, s: GameState): void {
  for (const op of operations) {
    const owned = s.operations[op.id];
    const status = root.querySelector<HTMLElement>(`[data-operation-status="${op.id}"]`);
    if (status)
      status.textContent = owned.running
        ? translate(s.settings.locale, 'operationSeconds', {
            n: Math.ceil(op.cycle - owned.progress),
          })
        : translate(s.settings.locale, 'operationReady');
    const progress = root.querySelector<HTMLElement>(`[data-operation-progress="${op.id}"]`);
    if (progress) {
      const percent = (owned.progress / op.cycle) * 100;
      progress.setAttribute('aria-valuenow', String(Math.floor(percent)));
      progress.querySelector<HTMLElement>('span')!.style.width = `${percent}%`;
    }
    const payout = root.querySelector<HTMLElement>(`[data-operation-payout="${op.id}"]`);
    if (payout)
      payout.textContent = money(
        owned.running ? owned.cyclePayout : operationPayout(op.id, owned.level || 1),
        s.settings.locale,
      );
    const start = root.querySelector<HTMLButtonElement>(
      `[data-action="operationStart"][data-id="${op.id}"]`,
    );
    if (start) {
      start.disabled = owned.running;
      start.textContent = translate(
        s.settings.locale,
        owned.running ? 'operationRunning' : 'operationStart',
      );
    }
  }
  const total = root.querySelector('[data-operation-total]');
  if (total)
    total.textContent = formatNumber(
      Object.values(s.operations).reduce((sum, op) => sum + op.level, 0),
      s.settings.locale,
    );
}
