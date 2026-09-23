import { describe, expect, it } from 'vitest';
import { newGame, v6StateSchema } from '../core/state';
import { cashReconciles } from '../core/finance';
import { tick, resume } from '../core/economy';
import {
  billLoanMonth,
  canDownsize,
  downsize,
  loanQuote,
  recoveryStatus,
  renegotiateRent,
  repayLoan,
  saleRefund,
  sellUpgrade,
  takeLoan,
  totalLiabilities,
  totalOverdue,
} from '../core/recovery';
import { migrate } from '../storage/save';
import { renderRecovery } from '../ui/finance';

function struggling() {
  const s = newGame(1000);
  s.office = 1;
  tick(s, 600);
  return s;
}

describe('obligations and recovery', () => {
  it('makes premature expansion risky while a lean or staffed office remains profitable', () => {
    const lean = newGame(1000);
    lean.employees = [{ id: 1, level: 1 }];
    const premature = structuredClone(lean);
    premature.office = 2;
    const staffed = structuredClone(premature);
    staffed.employees.push({ id: 2, level: 1 }, { id: 3, level: 1 });
    tick(lean, 600);
    tick(premature, 600);
    tick(staffed, 600);
    expect(lean.money).toBeCloseTo(2640);
    expect(totalOverdue(lean)).toBe(0);
    expect(premature.money).toBe(0);
    expect(totalOverdue(premature)).toBeCloseTo(360);
    expect(recoveryStatus(premature, -360)).toBe('crisis');
    expect(staffed.money).toBeCloseTo(4920);
    expect(totalOverdue(staffed)).toBe(0);
    expect(downsize(premature)).toBe(true);
    tick(premature, 600);
    expect(totalOverdue(premature)).toBe(0);
    expect(premature.money).toBeCloseTo(1560);
  });

  it('keeps unpaid operating costs in arrears and pays them from later income', () => {
    const s = struggling();
    expect(s.money).toBe(0);
    expect(s.recovery.overdue.office).toBe(720);
    expect(recoveryStatus(s, -720)).toBe('crisis');
    s.money = 1000;
    s.financial.baseline += 1000;
    // A later business period uses available cash to clear the old office bill.
    tick(s, 1);
    expect(totalOverdue(s)).toBeCloseTo(0);
    expect(s.money).toBeCloseTo(278.8);
    expect(recoveryStatus(s, -720)).toBe('recovered');
    expect(cashReconciles(s)).toBe(true);
  });

  it('limits loans to one at a time and bills twelve installments without counting income', () => {
    const s = struggling();
    const quote = loanQuote(s);
    expect(takeLoan(s)).toBe(true);
    expect(takeLoan(s)).toBe(false);
    expect(s.recovery.loan?.monthsLeft).toBe(12);
    expect(totalLiabilities(s)).toBeCloseTo(quote.total);
    expect(s.money).toBe(quote.principal - 720);
    expect(billLoanMonth(s)).toBeCloseTo(quote.installment);
    expect(s.recovery.loan?.monthsLeft).toBe(11);
    expect(s.financial.entries.find((entry) => entry.kind === 'loan')?.amount).toBe(
      quote.principal,
    );
    expect(s.totalEarned).toBe(0);
    expect(cashReconciles(s)).toBe(true);
    expect(repayLoan(s)).toBe(false);
    s.money += totalLiabilities(s);
    s.financial.baseline += totalLiabilities(s);
    expect(repayLoan(s)).toBe(true);
    expect(s.recovery.loan).toBeNull();
    expect(totalLiabilities(s)).toBe(0);
  });

  it('offers explicit equipment sale, rent concession, and capacity-limited downsize', () => {
    const s = struggling();
    s.reputation = 5;
    expect(renegotiateRent(s)).toBe(180);
    expect(s.recovery.overdue.office).toBe(540);
    expect(s.reputation).toBe(3);
    expect(renegotiateRent(s)).toBe(0);
    s.upgrades.coffee = 1;
    const refund = saleRefund(s, 'coffee');
    expect(sellUpgrade(s, 'coffee')).toBe(true);
    expect(s.upgrades.coffee).toBe(0);
    expect(sellUpgrade(s, 'coffee')).toBe(false);
    expect(totalOverdue(s)).toBe(Math.max(0, 540 - refund));
    s.employees = [
      { id: 1, level: 1 },
      { id: 2, level: 1 },
    ];
    expect(canDownsize(s)).toBe(false);
    s.employees.pop();
    expect(downsize(s)).toBe(true);
    expect(s.office).toBe(0);
    expect(cashReconciles(s)).toBe(true);
  });

  it('migrates v6 without inventing debt and preserves a debt-bearing v7 save', () => {
    const s = struggling();
    const old = v6StateSchema.parse({ ...s, saveVersion: 6 });
    const upgraded = migrate(old);
    expect(upgraded.recovery.overdue).toEqual({ salary: 0, office: 0, loan: 0 });
    expect(upgraded.money).toBe(s.money);
    expect(migrate(s).recovery).toEqual(s.recovery);
    const tampered = structuredClone(s);
    tampered.recovery.overdue.loan = 1;
    expect(() => migrate(tampered)).toThrow('Invalid loan arrears');
  });

  it('reaches the same debt and cash online and after one offline return', () => {
    const online = newGame(1000);
    online.office = 1;
    const offline = structuredClone(online);
    for (let i = 0; i < 1200; i++) tick(online, 1);
    resume(offline, 1000 + 1200 * 1000);
    expect(offline.money).toBeCloseTo(online.money);
    expect(offline.recovery.overdue.office).toBeCloseTo(online.recovery.overdue.office);
    expect(offline.financial.elapsed).toBe(online.financial.elapsed);
    expect(offline.pendingOffline?.seconds).toBe(1200);
    resume(offline, offline.savedAt);
    expect(offline.recovery.overdue.office).toBeCloseTo(online.recovery.overdue.office);
  });

  it('reconciles payroll and contract receipts across active and offline play', () => {
    const online = newGame(1000);
    online.employees = [{ id: 1, level: 1 }];
    online.office = 1;
    const offline = structuredClone(online);
    for (let i = 0; i < 1200; i++) tick(online, 1);
    resume(offline, 1000 + 1200 * 1000);
    expect(offline.completed).toBe(online.completed);
    expect(offline.money).toBeCloseTo(online.money);
    expect(offline.recovery.overdue.salary).toBeCloseTo(online.recovery.overdue.salary);
    expect(offline.recovery.overdue.office).toBeCloseTo(online.recovery.overdue.office);
    expect(cashReconciles(online)).toBe(true);
    expect(cashReconciles(offline)).toBe(true);
  });

  it('pays older salary and rent before a new delivery when returning offline', () => {
    const active = newGame(1000);
    active.employees = [{ id: 1, level: 1 }];
    active.office = 1;
    active.recovery.overdue.office = 180;
    const offline = structuredClone(active);
    for (let i = 0; i < 200; i++) tick(active, 0.1);
    resume(offline, 21000);
    expect(active.completed).toBe(1);
    expect(active.recovery.overdue.salary).toBeCloseTo(0);
    expect(active.recovery.overdue.office).toBeCloseTo(116);
    expect(offline.recovery.overdue.salary).toBeCloseTo(active.recovery.overdue.salary);
    expect(offline.recovery.overdue.office).toBeCloseTo(active.recovery.overdue.office);
    expect(offline.money).toBeCloseTo(active.money);
  });

  it('charges the same loan installment on a month boundary online and offline', () => {
    const active = struggling();
    expect(takeLoan(active)).toBe(true);
    const offline = structuredClone(active);
    offline.savedAt = 1000;
    for (let i = 0; i < 600; i++) tick(active, 1);
    resume(offline, 601000);
    expect(offline.recovery.loan?.monthsLeft).toBe(11);
    expect(offline.recovery.loan?.unbilled).toBeCloseTo(active.recovery.loan!.unbilled);
    expect(offline.recovery.overdue.loan).toBeCloseTo(active.recovery.overdue.loan);
    expect(offline.money).toBeCloseTo(active.money);
  });

  it('caps the absence and pauses a severe crisis without renewing it on reload', () => {
    const s = newGame(1000);
    s.office = 2;
    s.employees = [{ id: 1, level: 1 }];
    resume(s, 1000 + 86400000);
    expect(s.pendingOffline?.seconds).toBe(28800);
    expect(totalOverdue(s)).toBeCloseTo(17280);
    expect(s.company.pausedForReview).toBe(true);
    const saved = structuredClone(s);
    resume(s, s.savedAt + 86400000);
    expect(s.financial.elapsed).toBe(saved.financial.elapsed);
    expect(totalOverdue(s)).toBeCloseTo(totalOverdue(saved));
    expect(s.company.graceUntil).toBeNull();
  });

  it('renders recovery actions in both languages', () => {
    const s = struggling();
    expect(renderRecovery(s)).toContain('Contas em atraso');
    s.settings.locale = 'en-US';
    expect(renderRecovery(s)).toContain('Overdue bills');
    expect(renderRecovery(s)).not.toContain('undefined');
  });
});
