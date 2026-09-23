import { balance } from '../config/balance';
import { businessMonthSeconds, realizedPeriod } from './finance';
import {
  contract,
  employeeProduction,
  employeeSalary,
  expenses,
  revenue,
  workPerSecond,
} from './economy';
import { contractTerms } from './contracts';
import { operationRevenue } from './operations';
import type { GameState } from './state';
import { recoveryStatus, totalLiabilities, totalOverdue } from './recovery';

export function financialProjection(s: GameState) {
  const contractMonthly = (revenue(s) - operationRevenue(s)) * businessMonthSeconds;
  const recurringMonthly = operationRevenue(s) * businessMonthSeconds;
  const salaryMonthly =
    s.employees.reduce((sum, employee) => sum + employeeSalary(employee.level), 0) *
    businessMonthSeconds;
  const officeMonthly = balance.officeExpenses[s.office]! * businessMonthSeconds;
  const income = contractMonthly + recurringMonthly;
  const costs = salaryMonthly + officeMonthly;
  const result = income - costs;
  const burn = Math.max(0, -result);
  return {
    contractMonthly,
    recurringMonthly,
    salaryMonthly,
    officeMonthly,
    income,
    costs,
    result,
    burn,
    runway: burn > 0 ? s.money / burn : null,
    overdue: totalOverdue(s),
    liabilities: totalLiabilities(s),
    status: recoveryStatus(s, result),
    realized: realizedPeriod(s),
    month: Math.floor(s.financial.elapsed / businessMonthSeconds) + 1,
  };
}

export function decisionProjection(s: GameState, price: number, extraWork = 0, extraExpense = 0) {
  const monthly = financialProjection(s);
  const project = contract(s);
  const rate = workPerSecond(s) + extraWork;
  const deadline = contractTerms[project.id].deadline;
  const payment =
    project.pay *
    (rate > 0 && deadline !== null && project.work / rate > deadline + 1e-6 ? 0.9 : 1);
  const extraIncome =
    ((rate * payment) / project.work) * businessMonthSeconds - monthly.contractMonthly;
  const nextResult = monthly.result + extraIncome - extraExpense * businessMonthSeconds;
  const cashAfter = Math.max(0, s.money - price);
  return {
    cashAfter,
    costsBefore: expenses(s) * businessMonthSeconds,
    costsAfter: (expenses(s) + extraExpense) * businessMonthSeconds,
    resultBefore: monthly.result,
    resultAfter: nextResult,
    runwayAfter: nextResult < 0 ? cashAfter / -nextResult : null,
  };
}

export function hireDecision(s: GameState, price: number, level: number) {
  return decisionProjection(s, price, employeeProduction(s, level), employeeSalary(level));
}

export function officeDecision(s: GameState, price: number) {
  const extra = balance.officeExpenses[s.office + 1]! - balance.officeExpenses[s.office]!;
  return decisionProjection(s, price, 0, extra);
}
