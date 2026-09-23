import { z } from 'zod';
import { missionIds } from '../config/missions';
import { balance } from '../config/balance';
import { operationBalance } from '../config/operations';
import { financialKinds } from './finance';
const amount = z.number().finite().min(0).max(balance.maxValue);
const count = z.number().int().min(0).max(1e9);
export const legacyStateSchema = z.object({
  saveVersion: z.literal(1),
  money: amount,
  totalEarned: amount,
  xp: amount,
  reputation: count,
  clicks: count,
  completed: count,
  playSeconds: amount,
  office: z.number().int().min(0).max(2),
  project: z.enum(['landing', 'restaurant', 'shop', 'app']),
  queuedProject: z.enum(['landing', 'restaurant', 'shop', 'app']).nullable(),
  progress: amount,
  employees: z.array(z.object({ id: count, level: z.number().int().min(1).max(20) })).max(6),
  upgrades: z.object({
    coffee: count.max(5),
    keyboard: count.max(5),
    monitor: count.max(5),
    laptop: count.max(5),
    fiber: count.max(5),
  }),
  focus: z.number().min(0).max(100),
  deepWork: z.number().min(0).max(10),
  savedAt: z.number().finite().min(0).max(8640000000000000),
  pendingOffline: z
    .object({ seconds: amount, earned: amount, costs: amount, contracts: count })
    .nullable(),
  settings: z.object({
    sfx: z.boolean(),
    music: z.boolean(),
    haptics: z.boolean(),
    reducedMotion: z.boolean(),
    locale: z.enum(['pt-BR', 'en-US']),
  }),
});
export const v2StateSchema = legacyStateSchema.extend({
  saveVersion: z.literal(2),
  contractHistory: z.object({ landing: count, restaurant: count, shop: count, app: count }),
  legacyContract: z.enum(['landing', 'restaurant', 'shop', 'app']).nullable(),
});
export const v3StateSchema = v2StateSchema.extend({
  saveVersion: z.literal(3),
  missionState: z.object({
    claimed: z
      .array(z.enum(missionIds))
      .max(missionIds.length)
      .refine((ids) => new Set(ids).size === ids.length),
    promotions: count,
    peakProfit: amount,
  }),
});
export const v4StateSchema = v3StateSchema.extend({
  saveVersion: z.literal(4),
  employeeInvestments: z.record(z.string(), z.object({ amount, estimated: z.boolean() })),
});
const operationSchema = z.object({
  level: count.max(operationBalance.maxLevel),
  automated: z.boolean(),
  running: z.boolean(),
  progress: amount,
  cyclePayout: amount,
  earned: amount,
  cycles: count,
});
export function emptyOperations() {
  const empty = () => ({
    level: 0,
    automated: false,
    running: false,
    progress: 0,
    cyclePayout: 0,
    earned: 0,
    cycles: 0,
  });
  return { sites: empty(), menus: empty(), commerce: empty(), apps: empty(), saas: empty() };
}
export const v5StateSchema = v4StateSchema.extend({
  saveVersion: z.literal(5),
  operations: z.object({
    sites: operationSchema,
    menus: operationSchema,
    commerce: operationSchema,
    apps: operationSchema,
    saas: operationSchema,
  }),
  pendingOffline: z
    .object({
      seconds: amount,
      earned: amount,
      costs: amount,
      contracts: count,
      operationEarned: amount.default(0),
    })
    .nullable(),
});
export const v6StateSchema = v5StateSchema.extend({
  saveVersion: z.literal(6),
  financial: z.object({
    baseline: z.number().finite().min(-balance.maxValue).max(balance.maxValue),
    elapsed: amount,
    entries: z
      .array(
        z.object({
          period: count,
          kind: z.enum(financialKinds),
          amount: z.number().finite().min(-balance.maxValue).max(balance.maxValue),
        }),
      )
      .max(256),
  }),
});
const overdueSchema = z.object({ salary: amount, office: amount, loan: amount });
export function emptyRecovery() {
  return {
    overdue: { salary: 0, office: 0, loan: 0 },
    loan: null as null | {
      principal: number;
      unbilled: number;
      installment: number;
      monthsLeft: number;
    },
    renegotiatedPeriod: -1,
    recoveredUntil: -1,
  };
}
export const v7StateSchema = v6StateSchema.extend({
  saveVersion: z.literal(7),
  recovery: z.object({
    overdue: overdueSchema,
    loan: z
      .object({
        principal: amount,
        unbilled: amount,
        installment: amount,
        monthsLeft: count.max(12),
      })
      .nullable(),
    renegotiatedPeriod: z.number().int().min(-1).max(1e9),
    recoveredUntil: z.number().finite().min(-1).max(balance.maxValue),
  }),
});
const debtPointSchema = z.object({ month: count, amount });
const reportSchema = z.object({
  id: count.min(1),
  endedAt: z.number().finite().min(0).max(8640000000000000),
  elapsed: amount,
  totalEarned: amount,
  maxCash: amount,
  maxTeam: count.max(6),
  completed: count,
  contractHistory: z.object({ landing: count, restaurant: count, shop: count, app: count }),
  products: z.object({ sites: count, menus: count, commerce: count, apps: count, saas: count }),
  peakDebt: amount,
  endingDebt: amount,
  endingOverdue: amount,
  crisisDuration: amount,
  debtHistory: z.array(debtPointSchema).max(64),
  threshold: amount,
  historyPartial: z.boolean(),
});
export const v8StateSchema = v7StateSchema.extend({
  saveVersion: z.literal(8),
  career: z.object({
    nextCompanyId: count.min(1),
    reports: z.array(reportSchema).max(100),
    records: z.object({
      totalEarned: amount,
      maxCash: amount,
      maxTeam: count.max(6),
      completed: count,
    }),
  }),
  company: z.object({
    startedAt: z.number().finite().min(0).max(8640000000000000).nullable(),
    historyPartial: z.boolean(),
    peakCash: amount,
    peakTeam: count.max(6),
    peakDebt: amount,
    debtHistory: z.array(debtPointSchema).max(64),
    crisisSince: amount.nullable(),
    graceUntil: amount.nullable(),
    pausedForReview: z.boolean(),
    bankrupt: z.boolean(),
  }),
});
const clientSchema = z.object({ delivered: count, late: count, earned: amount });
export function emptyContractBook() {
  const client = () => ({ delivered: 0, late: 0, earned: 0 });
  return {
    active: null as null | {
      project: 'landing' | 'restaurant' | 'shop' | 'app';
      startedAt: number;
      deadline: number | null;
    },
    clients: { landing: client(), restaurant: client(), shop: client(), app: client() },
  };
}
export const v9StateSchema = v8StateSchema.extend({
  saveVersion: z.literal(9),
  contractBook: z.object({
    active: z
      .object({
        project: z.enum(['landing', 'restaurant', 'shop', 'app']),
        startedAt: amount,
        deadline: amount.nullable(),
      })
      .nullable(),
    clients: z.object({
      landing: clientSchema,
      restaurant: clientSchema,
      shop: clientSchema,
      app: clientSchema,
    }),
  }),
});
export const v10StateSchema = v9StateSchema.extend({
  saveVersion: z.literal(10),
  reservedEmployeeIds: z.array(count.min(1).max(6)).max(6),
});
const testingModeSchema = z.enum(['standard', 'quick', 'complete']);
export function emptyQuality() {
  return { preference: 'standard' as 'standard' | 'quick' | 'complete', active: null as null | { project: 'landing' | 'restaurant' | 'shop' | 'app'; mode: 'standard' | 'quick' | 'complete'; bugs: number; score: number }, bugsFixed: 0, lastScore: null as number | null, updateNotice: false };
}
export const stateSchema = v10StateSchema.extend({
  saveVersion: z.literal(11),
  quality: z.object({ preference: testingModeSchema, active: z.object({ project: z.enum(['landing','restaurant','shop','app']), mode: testingModeSchema, bugs: count.max(6), score: count.max(100) }).nullable(), bugsFixed: count, lastScore: count.max(100).nullable(), updateNotice: z.boolean() }),
});
export type GameState = z.infer<typeof stateSchema>;
export type CompanyReport = GameState['career']['reports'][number];
export function emptyCareer(): GameState['career'] {
  return {
    nextCompanyId: 1,
    reports: [],
    records: { totalEarned: 0, maxCash: 0, maxTeam: 0, completed: 0 },
  };
}
export function emptyCompany(now: number | null, historyPartial = false): GameState['company'] {
  return {
    startedAt: now,
    historyPartial,
    peakCash: 0,
    peakTeam: 0,
    peakDebt: 0,
    debtHistory: [],
    crisisSince: null,
    graceUntil: null,
    pausedForReview: false,
    bankrupt: false,
  };
}
export function newGame(now = Date.now()): GameState {
  return {
    saveVersion: 11,
    quality: emptyQuality(),
    reservedEmployeeIds: [],
    contractBook: emptyContractBook(),
    career: emptyCareer(),
    company: emptyCompany(now),
    recovery: emptyRecovery(),
    financial: { baseline: 0, elapsed: 0, entries: [] },
    operations: emptyOperations(),
    employeeInvestments: {},
    missionState: { claimed: [], promotions: 0, peakProfit: 0 },
    contractHistory: { landing: 0, restaurant: 0, shop: 0, app: 0 },
    legacyContract: null,
    money: 0,
    totalEarned: 0,
    xp: 0,
    reputation: 0,
    clicks: 0,
    completed: 0,
    playSeconds: 0,
    office: 0,
    project: 'landing',
    queuedProject: null,
    progress: 0,
    employees: [],
    upgrades: { coffee: 0, keyboard: 0, monitor: 0, laptop: 0, fiber: 0 },
    focus: 0,
    deepWork: 0,
    savedAt: now,
    pendingOffline: null,
    settings: { sfx: true, music: false, haptics: true, reducedMotion: false, locale: 'pt-BR' },
  };
}
