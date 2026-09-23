import { contractPayment, contractTerms, recordDelivery, startContract } from './contracts';
import { balance, projects, upgrades, type UpgradeId, type ProjectId } from '../config/balance';
import type { GameState } from './state';
import { canSelectProject, bestAvailableProject } from './progression';
import { careerRank, careerRanks, type CareerId } from './career';
import { advanceOperations, operationRevenue } from './operations';
import { operations } from '../config/operations';
import { businessMonthSeconds, recordMovement } from './finance';
import { billLoanMonth, chargeObligation, settleOverdue, totalOverdue } from './recovery';
import { updateCompany } from './bankruptcy';
import { currentStage } from './project-stages';
export function contract(s: GameState) {
  return projects.find((p) => p.id === s.project)!;
}
export function multiplier(s: GameState): number {
  return 1 + upgrades.reduce((n, u) => n + s.upgrades[u.id] * u.multiplier, 0);
}
export function clickPower(s: GameState): number {
  return (
    (balance.baseClick + upgrades.reduce((n, u) => n + s.upgrades[u.id] * u.click, 0)) *
    multiplier(s)
  );
}
export function focusMultiplier(s: GameState): number {
  return s.deepWork > 0 ? 2 : 1 + s.focus / 100;
}
export function workPerSecond(s: GameState): number {
  return s.employees.reduce(
    (n, e) => n + (s.reservedEmployeeIds.includes(e.id) ? 0 : employeeProduction(s, e.level)),
    0,
  );
}
export function employeeProduction(s: GameState, level: number): number {
  return balance.employeeWork * level * careerRank(level).multiplier * multiplier(s);
}
export function expenses(s: GameState): number {
  return (
    s.employees.reduce((n, e) => n + employeeSalary(e.level), 0) + balance.officeExpenses[s.office]!
  );
}
export function recordMissionProfit(s: GameState): void {
  s.missionState.peakProfit = Math.max(s.missionState.peakProfit, revenue(s) - expenses(s), 0);
}
export function contractQuote(s: GameState, id: ProjectId) {
  const p = projects.find((p) => p.id === id)!;
  const rate = workPerSecond(s);
  const duration = rate > 0 ? p.work / rate : null;
  const deadline = contractTerms[id].deadline;
  const payment =
    p.pay * (duration !== null && deadline !== null && duration > deadline + 1e-6 ? 0.9 : 1);
  const costs = duration === null ? null : duration * expenses(s);
  return { duration, deadline, payment, costs, profit: costs === null ? null : payment - costs };
}
export function revenue(s: GameState): number {
  const p = contract(s);
  return (workPerSecond(s) * contractQuote(s, p.id).payment) / p.work + operationRevenue(s);
}
export function employeeSalary(level: number): number {
  return balance.employeeSalary * level * careerRank(level).salaryMultiplier;
}
export function employeeCost(s: GameState, rankId: CareerId = 'junior'): number {
  const rank = careerRanks.find((r) => r.id === rankId);
  if (!rank) return Infinity;
  let investment: number = balance.employeeBaseCost;
  for (let level = 1; level < rank.level; level++) investment += trainCost(level);
  // Pay for skipped training plus a 25% premium for an immediately productive professional.
  return Math.ceil(
    investment * (rank.level > 1 ? 1.25 : 1) * balance.employeeCostMultiplier ** s.employees.length,
  );
}
export function upgradeCost(s: GameState, id: UpgradeId): number {
  return Math.ceil(
    upgrades.find((u) => u.id === id)!.cost * balance.upgradeCostMultiplier ** s.upgrades[id],
  );
}
export function trainCost(level: number): number {
  return Math.ceil(balance.employeeLevelCost * balance.employeeLevelMultiplier ** (level - 1));
}
function work(s: GameState, value: number, at = s.financial.elapsed): number {
  let done = 0;
  while (value > 0) {
    const p = contract(s);
    const stage = currentStage(s);
    const remaining = stage.remaining;
    if (value < remaining - 1e-7) {
      s.progress += value;
      break;
    }
    value = Math.max(0, value - remaining);
    s.progress = stage.end;
    // Development and testing never pay or switch the queue. Excess work carries forward.
    if (stage.id !== 'delivery') continue;
    const payment = contractPayment(s, at);
    recordDelivery(s, at, payment);
    const before = s.money;
    s.money = Math.min(balance.maxValue, s.money + payment);
    recordMovement(s, 'contract', before);
    s.totalEarned = Math.min(balance.maxValue, s.totalEarned + payment);
    s.completed++;
    s.contractHistory[p.id]++;
    s.xp += p.xp;
    s.reputation += p.reputation;
    done++;
    s.progress = 0;
    const next = s.queuedProject;
    s.project =
      next && canSelectProject(s, next)
        ? next
        : s.legacyContract
          ? bestAvailableProject(s)
          : s.project;
    s.queuedProject = null;
    s.legacyContract = null;
    startContract(s, at);
  }
  return done;
}
export function tap(s: GameState): { work: number; completed: number } {
  if (s.company.bankrupt || s.company.pausedForReview) return { work: 0, completed: 0 };
  s.clicks++;
  if (s.deepWork <= 0) {
    s.focus = Math.min(100, s.focus + balance.focusPerClick);
    if (s.focus === 100) s.deepWork = balance.deepWorkSeconds;
  }
  const value = clickPower(s) * focusMultiplier(s);
  const completed = work(s, value);
  settleOverdue(s);
  return { work: value, completed };
}
export function tick(
  s: GameState,
  seconds: number,
  offline = false,
): { earned: number; costs: number; contracts: number } {
  if (!Number.isFinite(seconds) || seconds <= 0) return { earned: 0, costs: 0, contracts: 0 };
  if (s.company.bankrupt || s.company.pausedForReview) return { earned: 0, costs: 0, contracts: 0 };
  recordMissionProfit(s);
  const duration = Math.min(seconds, balance.offlineCap);
  const before = s.totalEarned;
  let remaining = duration,
    costs = 0,
    done = 0;
  // Split at the next payout, focus expiry or financial month, independent of render frames.
  while (remaining > 1e-8) {
    const untilMonth = businessMonthSeconds - (s.financial.elapsed % businessMonthSeconds);
    const production = workPerSecond(s) * (offline || s.deepWork <= 0 ? 1 : 2);
    const untilContract = production > 0 ? (contract(s).work - s.progress) / production : Infinity;
    const untilOperation = Math.min(
      ...operations.map((op) =>
        s.operations[op.id].running
          ? Math.max(0, op.cycle - s.operations[op.id].progress)
          : Infinity,
      ),
    );
    const untilFocus = !offline && s.deepWork > 0 ? s.deepWork : Infinity;
    const part = Math.min(remaining, untilMonth, untilContract, untilOperation, untilFocus);
    // Resolve near-equal boundaries without discarding the rest of this tick.
    if (part <= 1e-8) {
      if (untilMonth <= 1e-8) {
        s.financial.elapsed =
          Math.round(s.financial.elapsed / businessMonthSeconds) * businessMonthSeconds;
        costs += billLoanMonth(s);
      } else if (untilContract <= 1e-8) {
        done += work(s, contract(s).work - s.progress);
        costs += settleOverdue(s);
      } else if (untilOperation <= 1e-8) {
        advanceOperations(s, 1e-8);
        costs += settleOverdue(s);
      } else if (untilFocus <= 1e-8) {
        s.deepWork = 0;
      }
      continue;
    }
    const boosted = offline ? 0 : Math.min(part, s.deepWork);
    const beforeCharges = s.money;
    settleOverdue(s);
    const salary = s.employees.reduce((sum, employee) => sum + employeeSalary(employee.level), 0);
    chargeObligation(s, 'salary', salary * part);
    chargeObligation(s, 'office', balance.officeExpenses[s.office]! * part);
    costs += beforeCharges - s.money;
    done += work(s, workPerSecond(s) * (part + boosted), s.financial.elapsed + part);
    advanceOperations(s, part);
    costs += settleOverdue(s);
    if (!offline) s.playSeconds += part;
    s.focus = Math.max(0, s.focus - balance.focusDecay * part);
    s.deepWork = Math.max(0, s.deepWork - part);
    const elapsed = s.financial.elapsed + part;
    const boundary = Math.round(elapsed / businessMonthSeconds) * businessMonthSeconds;
    s.financial.elapsed = Math.abs(elapsed - boundary) < 1e-6 ? boundary : elapsed;
    if (s.financial.elapsed === boundary && boundary > 0) costs += billLoanMonth(s);
    updateCompany(s, expenses(s) * businessMonthSeconds, offline);
    remaining -= part;
    if (s.company.bankrupt) break;
  }
  return { earned: s.totalEarned - before, costs, contracts: done };
}
export function buyUpgrade(s: GameState, id: UpgradeId): boolean {
  const cost = upgradeCost(s, id);
  if (s.upgrades[id] >= balance.maxUpgradeLevel || s.money < cost) return false;
  const before = s.money;
  s.money -= cost;
  recordMovement(s, 'equipment', before);
  s.upgrades[id]++;
  return true;
}
export function hire(s: GameState, rankId: CareerId = 'junior'): boolean {
  const rank = careerRanks.find((r) => r.id === rankId);
  if (!rank) return false;
  const cost = employeeCost(s, rankId);
  if (s.employees.length >= balance.maxEmployees[s.office]! || s.money < cost) return false;
  const before = s.money;
  s.money -= cost;
  recordMovement(s, 'hire', before);
  const id = [1, 2, 3, 4, 5, 6].find((id) => !s.employees.some((e) => e.id === id))!;
  s.employees.push({ id, level: rank.level });
  s.company.peakTeam = Math.max(s.company.peakTeam, s.employees.length);
  s.employeeInvestments[String(id)] = { amount: cost, estimated: false };
  return true;
}
export function train(s: GameState, id: number): boolean {
  const e = s.employees.find((e) => e.id === id);
  if (!e || e.level >= 20 || s.money < trainCost(e.level)) return false;
  const cost = trainCost(e.level);
  const before = s.money;
  s.money -= cost;
  recordMovement(s, 'training', before);
  const investment = s.employeeInvestments[String(id)] ?? { amount: 0, estimated: true };
  investment.amount += cost;
  s.employeeInvestments[String(id)] = investment;
  const previousLevel = e.level;
  e.level++;
  if (previousLevel === 9) s.missionState.promotions++;
  return true;
}
export function expand(s: GameState): boolean {
  const cost = balance.officeCosts[s.office + 1];
  if (cost === undefined || s.money < cost) return false;
  const before = s.money;
  s.money -= cost;
  recordMovement(s, 'expansion', before);
  s.office++;
  return true;
}
export function selectContract(s: GameState, id: ProjectId): boolean {
  const p = projects.find((p) => p.id === id);
  if (!p || !canSelectProject(s, id)) return false;
  if (id === s.project) {
    s.queuedProject = null;
    return true;
  }
  if (s.progress > 0) s.queuedProject = id;
  else {
    s.project = id;
    startContract(s);
    s.queuedProject = null;
    s.legacyContract = null;
  }
  return true;
}
export function resume(s: GameState, now: number): void {
  // A backwards clock never produces income or moves the watermark backwards.
  const seconds = Math.max(0, Math.min(balance.offlineCap, (now - s.savedAt) / 1000));
  s.savedAt = Math.max(s.savedAt, now);
  if (s.company.pausedForReview || s.company.bankrupt) return;
  if (seconds < 1) return;
  s.focus = 0;
  s.deepWork = 0;
  const operationBefore = Object.values(s.operations).reduce((sum, op) => sum + op.earned, 0);
  const overdueBefore = totalOverdue(s);
  const result = tick(s, seconds, true);
  if (seconds >= 30 && (result.earned > 0 || result.costs > 0 || totalOverdue(s) > overdueBefore)) {
    const previous = s.pendingOffline;
    s.pendingOffline = {
      seconds: seconds + (previous?.seconds ?? 0),
      earned: result.earned + (previous?.earned ?? 0),
      costs: result.costs + (previous?.costs ?? 0),
      contracts: result.contracts + (previous?.contracts ?? 0),
      operationEarned:
        Object.values(s.operations).reduce((sum, op) => sum + op.earned, 0) -
        operationBefore +
        (previous?.operationEarned ?? 0),
    };
  }
}

export function dismissalRefund(s: GameState, id: number): number {
  if (!s.employees.some((e) => e.id === id)) return 0;
  return Math.floor((s.employeeInvestments[String(id)]?.amount ?? 0) * 0.3);
}
export function dismiss(s: GameState, id: number): boolean {
  const index = s.employees.findIndex((e) => e.id === id);
  if (index < 0) return false;
  const before = s.money;
  s.money = Math.min(balance.maxValue, s.money + dismissalRefund(s, id));
  recordMovement(s, 'dismissal', before);
  settleOverdue(s);
  s.employees.splice(index, 1);
  s.reservedEmployeeIds = s.reservedEmployeeIds.filter((employeeId) => employeeId !== id);
  delete s.employeeInvestments[String(id)];
  if (s.queuedProject && !canSelectProject(s, s.queuedProject)) s.queuedProject = null;
  if (!canSelectProject(s, s.project)) {
    if (s.progress > 0) s.legacyContract = s.project;
    else {
      s.project = bestAvailableProject(s);
      startContract(s);
      s.legacyContract = null;
    }
  }
  return true;
}
