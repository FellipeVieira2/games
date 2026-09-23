import { assignEmployee, allocationPreview } from '../core/allocation';
import { currentStage } from '../core/project-stages';
import {
  buyUpgrade,
  dismiss,
  dismissalRefund,
  expand,
  hire,
  resume,
  selectContract,
  tap,
  tick,
  train,
} from '../core/economy';
import { type CareerId } from '../core/career';
import { newGame, type GameState } from '../core/state';
import { migrate } from '../storage/save';
import {
  investOperation,
  startOperation,
  automateOperation,
  type InvestmentSize,
} from '../core/operations';
import type { OperationId } from '../config/operations';
import { type ProjectId, type UpgradeId } from '../config/balance';

export type GameSdkListener = (state: GameState) => void;

export type GameSdk = {
  getState(): GameState;
  getContractStage(): ReturnType<typeof currentStage>;
  subscribe(listener: GameSdkListener): () => void;
  tap(): ReturnType<typeof tap>;
  tick(seconds: number, offline?: boolean): ReturnType<typeof tick>;
  resume(now: number): void;
  buyUpgrade(id: UpgradeId): boolean;
  hire(rankId?: CareerId): boolean;
  train(id: number): boolean;
  expand(): boolean;
  selectContract(id: ProjectId): boolean;
  assignEmployee(id: number, assigned: boolean): boolean;
  allocationPreview(id: number, assigned: boolean): ReturnType<typeof allocationPreview>;
  dismiss(id: number): boolean;
  dismissalRefund(id: number): number;
  investOperation(id: OperationId, size?: InvestmentSize): boolean;
  startOperation(id: OperationId): boolean;
  automateOperation(id: OperationId): boolean;
  serialize(): string;
  restore(serialized: string): void;
};

export type CreateGameSdkOptions = {
  initialState?: GameState;
  now?: number;
};

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function createGameSdk(options: CreateGameSdkOptions = {}): GameSdk {
  let state = cloneState(options.initialState ?? newGame(options.now));
  const listeners = new Set<GameSdkListener>();

  function notify(): void {
    const snapshot = cloneState(state);
    listeners.forEach((listener) => listener(snapshot));
  }

  function mutate<T>(action: () => T): T {
    const result = action();
    notify();
    return result;
  }

  return {
    getState: () => cloneState(state),
    getContractStage: () => currentStage(state),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tap: () => mutate(() => tap(state)),
    tick: (seconds, offline = false) => mutate(() => tick(state, seconds, offline)),
    resume: (now) => mutate(() => resume(state, now)),
    buyUpgrade: (id) => mutate(() => buyUpgrade(state, id)),
    hire: (rankId) => mutate(() => hire(state, rankId)),
    train: (id) => mutate(() => train(state, id)),
    expand: () => mutate(() => expand(state)),
    selectContract: (id) => mutate(() => selectContract(state, id)),
    assignEmployee: (id, assigned) => mutate(() => assignEmployee(state, id, assigned)),
    allocationPreview: (id, assigned) => allocationPreview(state, id, assigned),
    dismiss: (id) => mutate(() => dismiss(state, id)),
    dismissalRefund: (id) => dismissalRefund(state, id),
    investOperation: (id, size) => mutate(() => investOperation(state, id, size)),
    startOperation: (id) => mutate(() => startOperation(state, id)),
    automateOperation: (id) => mutate(() => automateOperation(state, id)),
    serialize: () => JSON.stringify(state),
    restore: (serialized) =>
      mutate(() => {
        state = migrate(JSON.parse(serialized));
      }),
  };
}
