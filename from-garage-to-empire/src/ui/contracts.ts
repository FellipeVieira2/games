import { contractTerms } from '../core/contracts';
import { projects } from '../config/balance';
import { projectRequirements, canSelectProject } from '../core/progression';
import type { GameState } from '../core/state';
import { translate, type TextKey } from '../i18n';
import { formatNumber, money } from '../utils/format';

export function renderContracts(s: GameState): string {
  const t = (key: TextKey, params?: Record<string, string | number>) =>
    translate(s.settings.locale, key, params);
  return `<div class="contract-route">${projects
    .map((p, index) => {
      const unlocked = canSelectProject(s, p.id),
        active = s.project === p.id,
        queued = s.queuedProject === p.id;
      const requirements = projectRequirements(s, p.id);
      const terms = contractTerms[p.id];
      const status = active
        ? 'active'
        : queued
          ? 'queuedContract'
          : unlocked
            ? 'availableContract'
            : 'lockedContract';
      return `<article class="contract-milestone ${active ? 'selected-card' : ''} ${unlocked ? 'unlocked' : 'locked'}">
      <div class="milestone-number">${String(index + 1).padStart(2, '0')}</div><div class="milestone-content">
      <div class="contract-status">${t(status)}<span data-contract-deliveries="${p.id}">${t('deliveriesCount', { n: s.contractHistory[p.id] })}</span></div>
      <h3>${t(p.id)}</h3><p>${terms.client} · ${t('contractComplexity', { n: terms.complexity })}</p>
      <div class="contract-facts"><strong>${money(p.pay, s.settings.locale)}</strong><span>${t('workAmount', { n: formatNumber(p.work, s.settings.locale) })}</span><span>${terms.deadline === null ? t('contractNoDeadline') : t('contractMinutes', { n: terms.deadline / 60 })}</span></div>
      ${
        requirements.length
          ? `<ul class="requirements">${requirements
              .map((r) => {
                const text =
                  r.kind === 'deliveries'
                    ? t('needDeliveries', { project: t(r.project!), n: r.target })
                    : r.kind === 'employees'
                      ? t('needEmployees', { n: r.target, level: r.level! })
                      : r.kind === 'office'
                        ? t('needOffice', { office: t(`officeName${r.target}` as TextKey) })
                        : t('requiresRep', { n: r.target });
                return `<li class="${r.met ? 'met' : 'unmet'}"><span aria-label="${t(r.met ? 'met' : 'unmet')}">${r.met ? '✓' : '○'}</span><span>${text}</span><b>${r.kind !== 'office' ? `${Math.min(r.current, r.target)}/${r.target}` : ''}</b></li>`;
              })
              .join('')}</ul>`
          : `<p class="starter-note">${t('starterProject')}</p>`
      }
      ${s.legacyContract === p.id ? `<p class="legacy-notice">${t('legacyProject')}</p>` : ''}
      <button class="secondary-button" data-action="contract" data-id="${p.id}" ${!unlocked && !active ? 'disabled' : ''}>${t(active || queued ? 'contractDetails' : unlocked ? 'contractReview' : 'lockedContract')}<span aria-hidden="true">${unlocked && !active ? '→' : ''}</span></button>
      </div></article>`;
    })
    .join('')}</div>`;
}
