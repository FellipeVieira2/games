import { missions } from '../config/missions';
import { missionProgress } from '../core/missions';
import type { GameState } from '../core/state';
import { translate } from '../i18n';
import { money, formatNumber } from '../utils/format';

export function renderMissions(s: GameState): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(s.settings.locale, key);
  const pending = missions.filter((m) => !s.missionState.claimed.includes(m.id));
  return `<h3>${t('missionsTitle')}</h3><p class="mission-help">${t(pending.length ? 'missionsHint' : 'missionsComplete')}</p><div class="mission-list">${pending
    .map((m) => {
      const progress = Math.min(m.target, missionProgress(s, m.id));
      const ready = progress >= m.target;
      const count = `${formatNumber(Math.floor(progress), s.settings.locale)} / ${m.target}`;
      return `<article class="mission-row ${ready ? 'ready' : ''}"><div class="mission-heading"><h4>${t(m.id)}</h4><span>${count}</span></div><div class="career-track" aria-hidden="true"><span style="width:${Math.floor((progress / m.target) * 100)}%"></span></div><div class="mission-actions"><b>+${money(m.reward, s.settings.locale)}</b><button data-action="mission" data-id="${m.id}" ${!ready ? 'disabled' : ''}>${t(ready ? 'missionClaim' : 'missionPending')}</button></div></article>`;
    })
    .join('')}</div>`;
}
