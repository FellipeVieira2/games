import { describe, expect, it } from 'vitest';
import { newGame, v8StateSchema } from '../core/state';
import { contractQuote, selectContract, tick } from '../core/economy';
import { contractPayment, startContract } from '../core/contracts';
import { cashReconciles } from '../core/finance';
import { migrate } from '../storage/save';

function ready() {
  const s = newGame(1000);
  s.money = 10000;
  s.financial.baseline = 10000;
  s.reputation = 100;
  s.contractHistory.landing = 3;
  s.contractHistory.restaurant = 3;
  s.contractHistory.shop = 3;
  s.completed = 9;
  s.office = 2;
  s.employees = [1, 2, 3].map((id) => ({ id, level: 3 }));
  return s;
}

describe('customer contracts and deadlines', () => {
  it('quotes the actual team, payroll and office before acceptance', () => {
    const s = ready();
    const quote = contractQuote(s, 'app');
    expect(quote.duration).toBeCloseTo(22000 / 45);
    expect(quote.deadline).toBe(480);
    expect(quote.payment).toBe(36000);
    expect(quote.costs).toBeCloseTo((22000 / 45) * 10.4);
    expect(quote.profit).toBeCloseTo(36000 - quote.costs!);
    s.employees[0]!.level = 4;
    expect(contractQuote(s, 'app').payment).toBe(40000);
    expect(contractQuote(newGame(), 'landing').duration).toBeNull();
  });
  it('starts a queued deadline only after the current delivery', () => {
    const s = ready();
    s.progress = 55;
    selectContract(s, 'app');
    expect(s.contractBook.active).toBeNull();
    tick(s, 1, true);
    expect(s.project).toBe('app');
    expect(s.contractBook.active).toEqual({ project: 'app', startedAt: 1, deadline: 481 });
  });
  it('pays 90% once for each late delivery and records the customer history', () => {
    const s = ready();
    selectContract(s, 'app');
    tick(s, 22000 / 45, true);
    expect(s.totalEarned).toBe(36000);
    expect(s.contractBook.clients.app).toEqual({ delivered: 1, late: 1, earned: 36000 });
    expect(s.contractBook.active!.deadline).toBeCloseTo(s.financial.elapsed + 480);
    expect(cashReconciles(s)).toBe(true);
    expect(migrate(s).contractBook).toEqual(s.contractBook);
  });
  it('treats delivery exactly at the deadline as on time', () => {
    const s = ready();
    selectContract(s, 'app');
    expect(contractPayment(s, 480)).toBe(40000);
    expect(contractPayment(s, 480 + 1e-7)).toBe(40000);
    expect(contractPayment(s, 481)).toBe(36000);
  });
  it('matches online frames and offline batches across late renewals and reload', () => {
    const s = ready();
    selectContract(s, 'app');
    const online = structuredClone(s);
    tick(s, 1800, true);
    for (let i = 0; i < 18000; i++) tick(online, 0.1);
    expect(online.money).toBeCloseTo(s.money, 5);
    expect(online.contractBook.clients).toEqual(s.contractBook.clients);
    expect(online.contractBook.active!.deadline).toBeCloseTo(s.contractBook.active!.deadline!, 5);
    const restored = migrate(s);
    tick(restored, 600, true);
    tick(s, 600, true);
    expect(restored.contractBook).toEqual(s.contractBook);
    expect(restored.money).toBe(s.money);
  });
  it('migrates v8 without inventing customers or penalizing the active delivery', () => {
    const old = ready();
    old.project = 'app';
    old.progress = 100;
    const s = migrate(v8StateSchema.parse({ ...old, saveVersion: 8 }));
    expect(s.contractBook.active).toBeNull();
    tick(s, 21900 / 45, true);
    expect(s.totalEarned).toBe(40000);
    expect(s.contractBook.clients.app.late).toBe(0);
    tick(s, 22000 / 45, true);
    expect(s.totalEarned).toBe(76000);
    expect(s.contractBook.clients.app.late).toBe(1);
  });
  it('never starts a deadline for a rejected offer and keeps beginner contracts untimed', () => {
    const s = newGame();
    expect(selectContract(s, 'app')).toBe(false);
    startContract(s);
    expect(s.contractBook.active!.deadline).toBeNull();
    expect(contractPayment(s, 100000)).toBe(100);
  });
  it('rejects invalid persisted contract history', () => {
    const s = ready();
    selectContract(s, 'app');
    s.contractBook.active!.startedAt = 1000;
    expect(() => migrate(s)).toThrow('Invalid contract history');
    s.contractBook.active!.startedAt = 0;
    s.contractBook.clients.app.late = 1;
    expect(() => migrate(s)).toThrow('Invalid contract history');
  });
});
