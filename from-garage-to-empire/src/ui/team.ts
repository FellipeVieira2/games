import { looks, employeeNames } from '../config/characters';
import { balance } from '../config/balance';
import { careerRank, careerRanks, nextRank } from '../core/career';
import {
  dismissalRefund,
  employeeProduction,
  employeeSalary,
  employeeCost,
  trainCost,
} from '../core/economy';
import type { GameState } from '../core/state';
import { translate } from '../i18n';
import { formatNumber, money } from '../utils/format';

/** Original vector portraits share the palette and accessories of the office actors. */
export function employeePortrait(id: number): string {
  const style = looks[id % looks.length]!;
  const color = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  const hair = color(style.hair),
    skin = color(style.skin);
  const longHair = id % 3 === 1;
  return `<svg class="employee-portrait" viewBox="0 0 120 132" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="132" rx="14" fill="${color(style.shadow)}"/>
    <circle cx="62" cy="53" r="44" fill="#fff1d6" opacity=".17"/>
    <path d="M8 117L109 16M-10 91L89 -8" stroke="#fff" opacity=".06" stroke-width="12"/>
    ${longHair ? `<rect x="29" y="23" width="65" height="78" rx="27" fill="${hair}"/>` : ''}
    <path d="M14 132V120Q16 95 47 94H75Q108 95 109 120V132" fill="${color(style.shirt)}" stroke="${color(style.shadow)}" stroke-width="3"/>
    <path d="M48 87V101Q61 115 74 101V87" fill="${skin}"/>
    <path d="M42 97L60 111L79 98M60 111V132" fill="none" stroke="${color(style.shadow)}" stroke-width="3"/>
    <rect x="82" y="112" width="12" height="15" rx="3" fill="#f1e8cf"/>
    <circle cx="88" cy="117" r="2" fill="${color(style.shadow)}"/>
    <ellipse cx="31" cy="65" rx="7" ry="10" fill="${skin}"/><ellipse cx="91" cy="65" rx="7" ry="10" fill="${skin}"/>
    <rect x="32" y="29" width="59" height="66" rx="25" fill="${skin}"/>
    <ellipse cx="44" cy="65" rx="7" ry="17" fill="#fff" opacity=".09"/>
    <path d="M30 51V39Q29 17 59 18Q91 15 94 43L88 52L80 38Q66 49 40 43L37 59Z" fill="${hair}"/>
    ${id % 3 === 0 ? `<g fill="${hair}"><circle cx="40" cy="29" r="14"/><circle cx="61" cy="23" r="16"/><circle cx="80" cy="28" r="13"/></g>` : longHair ? `<ellipse cx="35" cy="48" rx="10" ry="23" fill="${hair}"/><circle cx="93" cy="27" r="13" fill="${hair}"/>` : `<path d="M39 38L85 29L66 51Z" fill="${hair}"/>`}
    <path d="M43 58L51 57M70 57L78 58" stroke="${hair}" stroke-width="2.5" stroke-linecap="round"/>
    <g fill="#303b38"><ellipse cx="48" cy="66" rx="2.7" ry="3.7"/><ellipse cx="75" cy="66" rx="2.7" ry="3.7"/></g>
    <g fill="#fff"><circle cx="49" cy="65" r=".9"/><circle cx="76" cy="65" r=".9"/></g>
    <ellipse cx="41" cy="76" rx="6" ry="3" fill="#d0786d" opacity=".35"/><ellipse cx="81" cy="76" rx="6" ry="3" fill="#d0786d" opacity=".35"/>
    <path d="M61 67L59 76H63" fill="none" stroke="#99604d" opacity=".5" stroke-width="2" stroke-linecap="round"/>
    <path d="M54 82Q62 89 70 81" fill="none" stroke="#875645" stroke-width="2.3" stroke-linecap="round"/>
    ${id === 3 ? '<g fill="none" stroke="#344b51" stroke-width="2.5"><rect x="37" y="59" width="22" height="17" rx="6"/><rect x="65" y="59" width="22" height="17" rx="6"/><path d="M59 65H65"/></g>' : ''}
    ${id === 2 || id === 5 ? '<path d="M27 65V51C27 6 96 6 96 51V65" fill="none" stroke="#304950" stroke-width="6"/><rect x="23" y="55" width="11" height="23" rx="5" fill="#304950"/><rect x="89" y="55" width="11" height="23" rx="5" fill="#304950"/><path d="M95 76Q95 90 76 88" fill="none" stroke="#304950" stroke-width="3"/>' : ''}
  </svg>`;
}

export function renderHiring(s: GameState): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(s.settings.locale, key, values);
  const full = s.employees.length >= balance.maxEmployees[s.office]!;
  return careerRanks
    .map((rank) => {
      const cost = employeeCost(s, rank.id);
      return `<article class="item-card hire-card rank-${rank.id}"><span class="eyebrow">${t('newHire')}</span><h3>${t(rank.id)}</h3><p>${t('directHire', { level: rank.level })}</p><div class="item-stats"><span>${t('productivity')}<b>${formatNumber(employeeProduction(s, rank.level), s.settings.locale)}/s</b></span><span>${t('salary')}<b>${money(employeeSalary(rank.level), s.settings.locale)}/s</b></span></div>${rank.level > 1 ? `<p class="fine-print">${t('hirePremium')}</p>` : ''}<p>${full ? t('capacity') : t('teamCount', { n: s.employees.length, max: balance.maxEmployees[s.office]! })}</p><button class="secondary-button" data-action="hire" data-id="${rank.id}" data-cost="${cost}" data-locked="${full}" ${full || s.money < cost ? 'disabled' : ''}>${t('hireRank', { rank: t(rank.id) })}<b>${money(cost, s.settings.locale)}</b></button></article>`;
    })
    .join('');
}

export function renderEmployee(
  s: GameState,
  employee: GameState['employees'][number],
  details = false,
): string {
  const { id, level } = employee;
  const rank = careerRank(level),
    next = nextRank(level);
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(s.settings.locale, key, values);
  const fmt = (n: number) => formatNumber(n, s.settings.locale);
  const capped = level >= 20;
  const promoting = !capped && careerRank(level + 1).id !== rank.id;
  const name = employeeNames[(id - 1) % employeeNames.length]!;
  const progress = next ? ((level - rank.level) / (next.level - rank.level)) * 100 : 100;
  return `<article class="item-card employee-card rank-${rank.id} ${details ? 'employee-development' : ''}">
    <div class="employee-header">${employeePortrait(id)}<div class="employee-identity"><span class="career-badge">${t(rank.id)}</span><h3>${name}</h3><p>${t('employeeLevel', { n: level })} / 20</p></div></div>
    <div class="employee-tabs" role="group" aria-label="${name}"><button data-employee-view="summary" data-employee-id="${id}" aria-pressed="${!details}">${t('employeeSummary')}</button><button data-employee-view="training" data-employee-id="${id}" aria-pressed="${details}">${t('employeeTraining')}</button></div>
    ${
      details
        ? `
    <div class="career-path"><p>${next ? t('nextPromotion', { rank: t(next.id), level: next.level }) : t('careerComplete')} · ${t('careerBonus', { n: (rank.multiplier - 1) * 100 })}</p><div class="career-track" aria-hidden="true"><span style="width:${progress}%"></span></div></div>
    ${!capped ? `<p class="training-preview">${t('trainingPreview', { before: fmt(employeeProduction(s, level)), after: fmt(employeeProduction(s, level + 1)) })}</p>` : ''}
    ${!capped ? `<p class="training-preview">${t('salaryPreview', { before: money(employeeSalary(level), s.settings.locale), after: money(employeeSalary(level + 1), s.settings.locale) })}</p>` : ''}
    <button class="secondary-button ${promoting ? 'promotion-button' : ''}" data-action="train" data-id="${id}" data-cost="${capped ? 0 : trainCost(level)}" data-locked="${capped}" ${capped || s.money < trainCost(level) ? 'disabled' : ''}>${t(capped ? 'maxTrain' : promoting ? 'promotionAction' : 'train')}${capped ? '' : `<b>${money(trainCost(level), s.settings.locale)}</b>`}</button>
`
        : `
    <button class="allocation-button" data-action="allocation" data-id="${id}">${t(s.reservedEmployeeIds.includes(id) ? 'allocationReserve' : 'allocationContracts')} · ${t('allocationChange')}</button>
    <div class="item-stats"><span>${t('productivity')}<b>${fmt(s.reservedEmployeeIds.includes(id) ? 0 : employeeProduction(s, level))}/s</b></span><span>${t('salary')}<b>${money(employeeSalary(level), s.settings.locale)}/s</b></span></div>
    <button class="dismiss-button" data-action="dismiss" data-id="${id}">${t('dismiss')} · ${money(dismissalRefund(s, id), s.settings.locale)}</button>
`
    }
  </article>`;
}
