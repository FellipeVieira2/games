import { projects, type ProjectId } from '../config/balance';
import type { GameState } from './state';

export const projectStages = [
  { id: 'development', from: 0, to: 0.7 },
  { id: 'testing', from: 0.7, to: 0.95 },
  { id: 'delivery', from: 0.95, to: 1 },
] as const;

export function stagePlan(id: ProjectId) {
  const total = projects.find((project) => project.id === id)!.work;
  return projectStages.map((stage, index) => ({
    id: stage.id,
    index,
    start: total * stage.from,
    end: total * stage.to,
    work: total * stage.to - total * stage.from,
  }));
}

/** Derive the stage from persisted work: no duplicate counters or reset on migration. */
export function currentStage(s: Pick<GameState, 'project' | 'progress'>) {
  const plan = stagePlan(s.project);
  const stage = plan.find((entry) => s.progress < entry.end) ?? plan[2]!;
  const progress = Math.max(0, Math.min(stage.work, s.progress - stage.start));
  return {
    ...stage,
    progress,
    remaining: stage.work - progress,
    percent: (progress / stage.work) * 100,
  };
}
