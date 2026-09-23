import {
  stateSchema,
  v2StateSchema,
  v3StateSchema,
  v4StateSchema,
  v5StateSchema,
  v6StateSchema,
  v7StateSchema,
  v8StateSchema,
  v9StateSchema,
  v10StateSchema,
  emptyQuality,
  emptyContractBook,
  emptyRecovery,
  emptyCareer,
  emptyCompany,
  emptyOperations,
  legacyStateSchema,
  type GameState,
} from '../core/state';
import { balance, projects } from '../config/balance';
import { canSelectProject } from '../core/progression';
import { operations } from '../config/operations';
import { operationPayout } from '../core/operations';
import type { LoadResult, SaveService } from '../services/contracts';
export const SAVE_KEY = 'garage-empire.save.v1';
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
export const LEGACY_BACKUP_KEY = `${SAVE_KEY}.pre-v2`;
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function migrate(input: unknown): GameState {
  let candidate = input;
  if (
    typeof input === 'object' &&
    input !== null &&
    'saveVersion' in input &&
    input.saveVersion === 1
  ) {
    const old = legacyStateSchema.parse(input);
    const oldProjects = {
      landing: { work: 100, rep: 0 },
      restaurant: { work: 240, rep: 3 },
      shop: { work: 750, rep: 12 },
      app: { work: 2400, rep: 45 },
    };
    if (
      old.progress >= oldProjects[old.project].work ||
      old.reputation < oldProjects[old.project].rep ||
      (old.queuedProject && old.reputation < oldProjects[old.queuedProject].rep)
    )
      throw new Error('Invalid v1 progression');
    const migrated: GameState = {
      ...old,
      saveVersion: 11 as const,
      quality: { ...emptyQuality(), updateNotice: true },
      reservedEmployeeIds: [],
      contractBook: emptyContractBook(),
      career: emptyCareer(),
      company: { ...emptyCompany(null, true), peakCash: old.money, peakTeam: old.employees.length },
      recovery: emptyRecovery(),
      financial: { baseline: old.money, elapsed: 0, entries: [] },
      operations: emptyOperations(),
      pendingOffline: old.pendingOffline ? { ...old.pendingOffline, operationEarned: 0 } : null,
      employeeInvestments: {},
      missionState: { claimed: [], promotions: 0, peakProfit: 0 },
      contractHistory: { landing: 0, restaurant: 0, shop: 0, app: 0 },
      legacyContract: null,
    };
    // v1 never recorded project-specific history: preserve totals without inventing deliveries.
    migrated.progress =
      (old.progress / oldProjects[old.project].work) *
      projects.find((p) => p.id === old.project)!.work;
    if (!canSelectProject(migrated, old.project)) migrated.legacyContract = old.project;
    if (migrated.queuedProject && !canSelectProject(migrated, migrated.queuedProject))
      migrated.queuedProject = null;
    candidate = migrated;
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 2
  ) {
    candidate = {
      ...v2StateSchema.parse(candidate),
      saveVersion: 3,
      missionState: { claimed: [], promotions: 0, peakProfit: 0 },
    };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 3
  ) {
    candidate = { ...v3StateSchema.parse(candidate), saveVersion: 4, employeeInvestments: {} };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 4
  ) {
    candidate = {
      ...v4StateSchema.parse(candidate),
      saveVersion: 5,
      operations: emptyOperations(),
    };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 5
  ) {
    const old = v5StateSchema.parse(candidate);
    candidate = {
      ...old,
      saveVersion: 6,
      financial: { baseline: old.money, elapsed: 0, entries: [] },
    };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 6
  ) {
    candidate = { ...v6StateSchema.parse(candidate), saveVersion: 7, recovery: emptyRecovery() };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 7
  ) {
    const old = v7StateSchema.parse(candidate);
    const debt =
      old.recovery.overdue.salary +
      old.recovery.overdue.office +
      old.recovery.overdue.loan +
      (old.recovery.loan?.unbilled ?? 0);
    candidate = {
      ...old,
      saveVersion: 8,
      career: emptyCareer(),
      company: {
        ...emptyCompany(null, true),
        peakCash: old.money,
        peakTeam: old.employees.length,
        peakDebt: debt,
        crisisSince:
          old.recovery.overdue.salary + old.recovery.overdue.office + old.recovery.overdue.loan > 0
            ? old.financial.elapsed
            : null,
      },
    };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 8
  ) {
    candidate = {
      ...v8StateSchema.parse(candidate),
      saveVersion: 9,
      contractBook: emptyContractBook(),
    };
  }
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'saveVersion' in candidate &&
    candidate.saveVersion === 9
  ) {
    candidate = { ...v9StateSchema.parse(candidate), saveVersion: 10, reservedEmployeeIds: [] };
  }
  if (typeof candidate === 'object' && candidate !== null && 'saveVersion' in candidate && candidate.saveVersion === 10) {
    const old = v10StateSchema.parse(candidate);
    candidate = { ...old, saveVersion: 11, quality: { ...emptyQuality(), updateNotice: true },
      savedAt: Math.max(old.savedAt, Date.now()),
      company: { ...old.company, crisisSince: old.company.crisisSince === null ? null : old.financial.elapsed, graceUntil: old.company.graceUntil === null ? null : Math.max(old.company.graceUntil, old.financial.elapsed + 1200) }
    };
  }
  const s = stateSchema.parse(candidate);
  if (s.quality.active && (s.quality.active.project !== s.project || s.quality.active.score !== Math.max(0, 100 - s.quality.active.bugs * 10))) throw new Error('Invalid quality plan');
  if (
    new Set(s.reservedEmployeeIds).size !== s.reservedEmployeeIds.length ||
    s.reservedEmployeeIds.some((id) => !s.employees.some((employee) => employee.id === id))
  )
    throw new Error('Invalid team allocation');
  const activeContract = s.contractBook.active;
  if (
    (activeContract &&
      (activeContract.project !== s.project ||
        activeContract.startedAt > s.financial.elapsed + 1e-6 ||
        (activeContract.deadline !== null &&
          activeContract.deadline < activeContract.startedAt))) ||
    Object.values(s.contractBook.clients).some((client) => client.late > client.delivered)
  )
    throw new Error('Invalid contract history');
  if (
    s.career.reports.some((report) => report.id >= s.career.nextCompanyId) ||
    new Set(s.career.reports.map((report) => report.id)).size !== s.career.reports.length ||
    (s.company.bankrupt && s.company.pausedForReview) ||
    (s.company.crisisSince !== null && s.company.crisisSince > s.financial.elapsed) ||
    s.company.debtHistory.some((point) => point.month > Math.floor(s.financial.elapsed / 600))
  )
    throw new Error('Invalid company history');
  if (
    s.recovery.loan &&
    ((s.recovery.loan.unbilled <= 0 && s.recovery.overdue.loan <= 0) ||
      s.recovery.loan.principal <= 0 ||
      s.recovery.loan.installment <= 0 ||
      s.recovery.loan.unbilled > s.recovery.loan.installment * s.recovery.loan.monthsLeft + 1e-5)
  )
    throw new Error('Invalid loan');
  if (!s.recovery.loan && s.recovery.overdue.loan > 0) throw new Error('Invalid loan arrears');
  if (
    s.financial.entries.some((entry) => entry.period > Math.floor(s.financial.elapsed / 600)) ||
    Math.abs(
      s.financial.baseline +
        s.financial.entries.reduce((sum, entry) => sum + entry.amount, 0) -
        s.money,
    ) > Math.max(1e-5, Math.abs(s.money) * 1e-12)
  )
    throw new Error('Invalid financial ledger');
  for (const op of operations) {
    const owned = s.operations[op.id];
    if (
      owned.progress >= op.cycle ||
      (owned.automated && !owned.running) ||
      (!owned.running && (owned.progress !== 0 || owned.cyclePayout !== 0)) ||
      (owned.running &&
        (!owned.level ||
          owned.cyclePayout <= 0 ||
          owned.cyclePayout > operationPayout(op.id, owned.level))) ||
      (!owned.level && (owned.earned !== 0 || owned.cycles !== 0))
    )
      throw new Error('Invalid operation state');
  }
  for (const [index, employee] of s.employees.entries()) {
    if (!s.employeeInvestments[String(employee.id)]) {
      let amount = Math.ceil(balance.employeeBaseCost * balance.employeeCostMultiplier ** index);
      for (let level = 1; level < employee.level; level++)
        amount += Math.ceil(
          balance.employeeLevelCost * balance.employeeLevelMultiplier ** (level - 1),
        );
      s.employeeInvestments[String(employee.id)] = { amount, estimated: true };
    }
  }
  const p = projects.find((p) => p.id === s.project)!;
  if (
    s.progress >= p.work ||
    s.employees.length > balance.maxEmployees[s.office]! ||
    new Set(s.employees.map((e) => e.id)).size !== s.employees.length ||
    (s.legacyContract !== null && s.legacyContract !== s.project) ||
    (!s.legacyContract && !canSelectProject(s, s.project)) ||
    Object.values(s.contractHistory).reduce((a, b) => a + b, 0) > s.completed ||
    (s.queuedProject && !canSelectProject(s, s.queuedProject))
  )
    throw new Error('Invalid game invariants');
  return s;
}
export class LocalSaveService implements SaveService {
  private blocked = false;
  private legacyOriginal: string | null = null;
  constructor(private readonly store: KeyValueStore) {}
  load(): LoadResult {
    let invalid = false;
    try {
      for (const key of [SAVE_KEY, BACKUP_KEY]) {
        const raw = this.store.getItem(key);
        if (!raw) continue;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'saveVersion' in parsed &&
            Number(parsed.saveVersion) > balance.version
          ) {
            this.blocked = true;
            return { state: null, issue: 'future' };
          }
          const isMigration =
            typeof parsed === 'object' &&
            parsed !== null &&
            'saveVersion' in parsed &&
            parsed.saveVersion === 1;
          const state = migrate(parsed);
          if (isMigration) this.legacyOriginal = raw;
          return {
            state,
            issue: key === BACKUP_KEY ? 'backup' : isMigration ? 'migrated' : null,
          };
        } catch {
          invalid = true;
        }
      }
    } catch {
      this.blocked = true;
      return { state: null, issue: 'unavailable' };
    }
    this.blocked = invalid;
    return { state: null, issue: invalid ? 'corrupt' : null };
  }
  save(state: GameState): boolean {
    if (this.blocked) return false;
    try {
      const serialized = JSON.stringify(migrate(state));
      // Also retain v1 recovered from the backup when the primary is unreadable.
      if (this.legacyOriginal && !this.store.getItem(LEGACY_BACKUP_KEY))
        this.store.setItem(LEGACY_BACKUP_KEY, this.legacyOriginal);
      const previous = this.store.getItem(SAVE_KEY);
      let archived = false;
      if (previous) {
        let valid = false;
        let oldVersion = false;
        try {
          const parsed = JSON.parse(previous) as { saveVersion?: number };
          const old = migrate(parsed);
          valid = true;
          oldVersion = parsed.saveVersion === 1;
          archived = state.career.reports.length > old.career.reports.length;
        } catch {
          /* Retain the valid backup when the primary save is corrupt. */
        }
        if (valid) {
          if (oldVersion && !this.store.getItem(LEGACY_BACKUP_KEY))
            this.store.setItem(LEGACY_BACKUP_KEY, previous);
          this.store.setItem(BACKUP_KEY, previous);
        }
      }
      this.store.setItem(SAVE_KEY, serialized);
      if (archived) {
        // A successful archive is also copied to the backup; failure here must not
        // report a failed restart after the primary save has already committed.
        try {
          this.store.setItem(BACKUP_KEY, serialized);
        } catch {
          /* Primary remains valid. */
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
