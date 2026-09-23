import type { GameState } from '../core/state';
export interface AdService {
  rewarded(placement: string): Promise<{ rewarded: boolean }>;
}
export interface PurchaseService {
  purchase(product: string): Promise<{ purchased: boolean }>;
  restore(): Promise<string[]>;
}
export interface AnalyticsService {
  track(event: string, properties?: Record<string, string | number>): void;
}
export interface AudioService {
  play(sound: 'tap' | 'reward' | 'upgrade'): void;
  music(enabled: boolean): void;
  pause(): void;
  dispose(): void;
}
export type LoadResult = {
  state: GameState | null;
  issue: 'backup' | 'corrupt' | 'unavailable' | 'future' | 'migrated' | null;
};
export interface SaveService {
  load(): LoadResult;
  save(state: GameState): boolean;
}
