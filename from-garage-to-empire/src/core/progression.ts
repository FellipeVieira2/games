import { projects, type ProjectId } from '../config/balance';
import type { GameState } from './state';

export type Requirement = {
  kind: 'deliveries' | 'employees' | 'office' | 'reputation';
  current: number;
  target: number;
  met: boolean;
  project?: ProjectId;
  level?: number;
};
export function projectRequirements(s: GameState, id: ProjectId): Requirement[] {
  const p = projects.find((p) => p.id === id)!;
  const requirements: Requirement[] = [];
  if (p.previous)
    requirements.push({
      kind: 'deliveries',
      current: s.contractHistory[p.previous],
      target: p.deliveries,
      met: s.contractHistory[p.previous] >= p.deliveries,
      project: p.previous,
    });
  if (p.employees) {
    const qualified = s.employees.filter((e) => e.level >= p.employeeLevel).length;
    requirements.push({
      kind: 'employees',
      current: qualified,
      target: p.employees,
      level: p.employeeLevel,
      met: qualified >= p.employees,
    });
  }
  if (p.office)
    requirements.push({
      kind: 'office',
      current: s.office,
      target: p.office,
      met: s.office >= p.office,
    });
  if (p.required)
    requirements.push({
      kind: 'reputation',
      current: s.reputation,
      target: p.required,
      met: s.reputation >= p.required,
    });
  return requirements;
}
export function canSelectProject(s: GameState, id: ProjectId): boolean {
  return projectRequirements(s, id).every((r) => r.met);
}
export function bestAvailableProject(s: GameState): ProjectId {
  return [...projects].reverse().find((p) => canSelectProject(s, p.id))!.id;
}
