import { describe, expect, it } from 'vitest';
import { createGameSdk } from '../sdk';

describe('game SDK', () => {
  it('exposes isolated snapshots and deterministic actions', () => {
    const sdk = createGameSdk({ now: 1_000 });
    const snapshot = sdk.getState();
    snapshot.money = 999;

    expect(sdk.getState().money).toBe(0);
    expect(sdk.tap().work).toBeGreaterThan(0);
    expect(sdk.getState().clicks).toBe(1);
  });

  it('serializes and restores a validated state', () => {
    const sdk = createGameSdk({ now: 1_000 });
    sdk.tap();
    const serialized = sdk.serialize();
    sdk.tick(30);

    sdk.restore(serialized);

    expect(sdk.getState().clicks).toBe(1);
    expect(() => sdk.restore('{"invalid":true}')).toThrow();
  });
});