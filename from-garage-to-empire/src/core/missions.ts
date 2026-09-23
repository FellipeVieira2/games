import { missions } from '../config/missions';
import { balance } from '../config/balance';
import type { GameState } from './state';
import { recordMovement } from './finance';
import { settleOverdue } from './recovery';

export function missionProgress(s: GameState, id: string): number {
  switch (id) {
    case 'firstDelivery':
      return s.completed;
    case 'firstHire':
      return s.employees.length;
    case 'threeShops':
      return s.contractHistory.shop;
    case 'firstPromotion':
      return s.missionState.promotions;
    case 'profitTarget':
      return s.missionState.peakProfit;
    case 'firstOperation':
      return Object.values(s.operations).filter((op) => op.level > 0).length;
    case 'firstAutomation':
    case 'operationDiversify':
      return Object.values(s.operations).filter((op) => op.automated).length;
    case 'operationMilestone':
      return Math.max(...Object.values(s.operations).map((op) => op.level));
    case 'operationSaas':
      return s.operations.saas.level > 0 ? 1 : 0;
    default:
      return 0;
  }
}

export function claimMission(s: GameState, id: string): number {
  const mission = missions.find((m) => m.id === id);
  if (
    !mission ||
    s.missionState.claimed.includes(mission.id) ||
    missionProgress(s, id) < mission.target
  )
    return 0;
  s.missionState.claimed.push(mission.id);
  const before = s.money;
  s.money = Math.min(balance.maxValue, s.money + mission.reward);
  recordMovement(s, 'mission', before);
  settleOverdue(s);
  // Mission bonuses are not contract revenue and cannot advance profit objectives.
  return mission.reward;
}
