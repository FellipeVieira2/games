import { describe, expect, it } from 'vitest';
import { businessMonthSeconds, cashReconciles } from '../core/finance';
import {
  continueCompany,
  insolvencyLimit,
  recoveryGraceMonths,
  restartCompany,
  buildReport,
} from '../core/bankruptcy';
import { downsize, totalOverdue } from '../core/recovery';
import { resume, tick } from '../core/economy';
import { newGame, v7StateSchema } from '../core/state';
import { LocalSaveService, SAVE_KEY, migrate } from '../storage/save';
import { renderRecovery } from '../ui/finance';

function overexpanded() {
  const s = newGame(1000);
  s.office = 2;
  s.employees = [{ id: 1, level: 1 }];
  return s;
}

describe('bankruptcy and career', () => {
  it('does not close an empty garage merely because cash is zero', () => {
    const s = newGame(1000);
    tick(s, 28800);
    expect(s.money).toBe(0);
    expect(s.company.bankrupt).toBe(false);
    expect(s.company.graceUntil).toBeNull();
  });

  it('requires overdue debt, the limit and crisis age before a persistent grace period', () => {
    const s = overexpanded();
    const monthlyCosts = 3360;
    expect(insolvencyLimit(monthlyCosts)).toBe(10080);
    tick(s, 6 * businessMonthSeconds);
    expect(s.company.graceUntil).toBeNull();
    expect(s.company.bankrupt).toBe(false);
    for (let i = 0; i < 30 && s.company.graceUntil === null; i++) tick(s, businessMonthSeconds);
    expect(s.company.graceUntil).not.toBeNull();
    expect(totalOverdue(s)).toBeGreaterThanOrEqual(10080);
    const deadline = s.company.graceUntil!;
    expect(deadline - s.financial.elapsed).toBe(recoveryGraceMonths * businessMonthSeconds);
    tick(s, recoveryGraceMonths * businessMonthSeconds + 1);
    expect(s.company.bankrupt).toBe(true);
    expect(s.financial.elapsed).toBeGreaterThanOrEqual(deadline);
    const frozen = structuredClone(s);
    tick(s, 600);
    expect(s).toEqual(frozen);
    expect(cashReconciles(s)).toBe(true);
  });

  it('pauses an eight-hour return, persists the review and allows recovery by downsizing', () => {
    const s = overexpanded();
    resume(s, s.savedAt + 86400000);
    expect(s.company.pausedForReview).toBe(true);
    expect(s.company.bankrupt).toBe(false);
    expect(renderRecovery(s)).toContain('data-action="continueCompany"');
    expect(totalOverdue(s)).toBeCloseTo(17280);
    const stored = migrate(s);
    const elapsed = stored.financial.elapsed;
    resume(stored, stored.savedAt + 86400000);
    expect(stored.financial.elapsed).toBe(elapsed);
    expect(stored.company.graceUntil).toBeNull();
    expect(downsize(stored)).toBe(true);
    continueCompany(stored, 1080);
    const deadline = stored.company.graceUntil;
    expect(deadline).toBe(elapsed + recoveryGraceMonths * businessMonthSeconds);
    resume(stored, stored.savedAt + 86400000);
    expect(stored.company.bankrupt).toBe(false);
    expect(stored.company.pausedForReview).toBe(false);
    expect(totalOverdue(stored)).toBe(0);
    expect(stored.company.graceUntil).toBeNull();
  });

  it('archives evidence once and starts a clean company with career records and settings', () => {
    const s = overexpanded();
    s.settings.music = true;
    tick(s, 40 * businessMonthSeconds);
    expect(s.company.bankrupt).toBe(true);
    const report = buildReport(s, 9000, 3360);
    expect(report.endingOverdue).toBeGreaterThanOrEqual(report.threshold);
    expect(report.crisisDuration).toBeGreaterThan(6 * businessMonthSeconds);
    expect(report.contractHistory.landing).toBe(s.contractHistory.landing);
    expect(report.products.sites).toBe(0);
    expect(report.debtHistory.length).toBeGreaterThan(1);
    const next = restartCompany(s, 9000, 3360);
    expect(next.money).toBe(0);
    expect(next.employees).toEqual([]);
    expect(next.office).toBe(0);
    expect(next.settings.music).toBe(true);
    expect(next.career.reports).toEqual([report]);
    expect(next.career.nextCompanyId).toBe(2);
    expect(next.career.records.totalEarned).toBe(s.totalEarned);
    expect(() => restartCompany(next, 10000, 0)).toThrow();
    expect(migrate(next)).toEqual(next);
  });

  it('leaves the prior company saved if archiving cannot be written', () => {
    const data = new Map<string, string>();
    let fail = false;
    const saves = new LocalSaveService({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (fail && key === SAVE_KEY) throw new Error('quota');
        data.set(key, value);
      },
    });
    const s = overexpanded();
    tick(s, 40 * businessMonthSeconds);
    expect(saves.save(s)).toBe(true);
    const original = data.get(SAVE_KEY);
    fail = true;
    expect(saves.save(restartCompany(s, 9000, 3360))).toBe(false);
    expect(data.get(SAVE_KEY)).toBe(original);
    fail = false;
    expect(saves.load().state?.company.bankrupt).toBe(true);
    expect(saves.save(restartCompany(s, 9000, 3360))).toBe(true);
    expect(saves.load().state?.career.reports).toHaveLength(1);
    expect(JSON.parse(data.get(`${SAVE_KEY}.backup`)!).career.reports).toHaveLength(1);
  });

  it('migrates v7 assets without inventing historical peaks or immediate bankruptcy', () => {
    const s = overexpanded();
    tick(s, 600);
    const old = v7StateSchema.parse({ ...s, saveVersion: 7 });
    const migrated = migrate(old);
    expect(migrated.saveVersion).toBe(10);
    expect(migrated.company.historyPartial).toBe(true);
    expect(migrated.company.startedAt).toBeNull();
    expect(migrated.company.peakDebt).toBeCloseTo(totalOverdue(s));
    expect(migrated.company.crisisSince).toBe(migrated.financial.elapsed);
    expect(migrated.company.bankrupt).toBe(false);
    expect(migrated.career.reports).toEqual([]);
  });
});
