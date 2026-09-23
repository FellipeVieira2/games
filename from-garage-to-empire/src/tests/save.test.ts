import { describe, expect, it } from 'vitest';
import { LocalSaveService, SAVE_KEY, BACKUP_KEY, migrate } from '../storage/save';
import { newGame } from '../core/state';
import { resume } from '../core/economy';
function fixture() {
  const data = new Map<string, string>();
  return {
    data,
    save: new LocalSaveService({
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v);
      },
    }),
  };
}
describe('save safety', () => {
  it('round-trips validated state and preferences with a previous valid backup', () => {
    const { data, save } = fixture();
    const s = newGame();
    s.settings.music = true;
    expect(save.save(s)).toBe(true);
    s.money = 500;
    s.financial.baseline = 500;
    save.save(s);
    expect(save.load().state).toEqual(s);
    expect(JSON.parse(data.get(BACKUP_KEY)!).money).toBe(0);
  });
  it('recovers the backup without replacing it with corrupt primary data', () => {
    const { data, save } = fixture();
    save.save(newGame());
    save.save(newGame());
    data.set(SAVE_KEY, '{bad json');
    const result = save.load();
    expect(result.issue).toBe('backup');
    expect(result.state).not.toBeNull();
    const backup = data.get(BACKUP_KEY);
    save.save(result.state!);
    expect(data.get(BACKUP_KEY)).toBe(backup);
  });
  it('preserves unrecoverable saves and blocks silent overwrite', () => {
    const { data, save } = fixture();
    data.set(SAVE_KEY, 'broken');
    data.set(BACKUP_KEY, 'broken too');
    expect(save.load().issue).toBe('corrupt');
    expect(save.save(newGame())).toBe(false);
    expect(data.get(SAVE_KEY)).toBe('broken');
  });
  it('does not downgrade a future-version save to an older backup', () => {
    const { data, save } = fixture();
    data.set(SAVE_KEY, JSON.stringify({ saveVersion: 11 }));
    data.set(BACKUP_KEY, JSON.stringify(newGame()));
    expect(save.load().issue).toBe('future');
    expect(save.save(newGame())).toBe(false);
  });
  it('reports denied reads and quota failures', () => {
    const denied = new LocalSaveService({
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota');
      },
    });
    expect(denied.load().issue).toBe('unavailable');
    expect(denied.save(newGame())).toBe(false);
    const quota = new LocalSaveService({
      getItem: () => null,
      setItem() {
        throw new Error('quota');
      },
    });
    expect(quota.save(newGame())).toBe(false);
  });
  it('rejects invalid numbers and impossible progress, capacity, and contract locks', () => {
    const s = newGame();
    s.money = Infinity;
    expect(() => migrate(s)).toThrow();
    s.money = -1;
    expect(() => migrate(s)).toThrow();
    s.money = 0;
    s.progress = 100;
    expect(() => migrate(s)).toThrow();
    s.progress = 0;
    s.project = 'app';
    expect(() => migrate(s)).toThrow();
    s.project = 'landing';
    s.employees = [
      { id: 1, level: 1 },
      { id: 2, level: 1 },
    ];
    expect(() => migrate(s)).toThrow();
  });
  it('persists offline settlement before collecting, including reloads', () => {
    const { save } = fixture();
    const s = newGame(1000);
    s.employees = [{ id: 1, level: 1 }];
    resume(s, 61000);
    save.save(s);
    const loaded = save.load().state!;
    const amount = loaded.money;
    resume(loaded, 61000);
    expect(loaded.money).toBe(amount);
    expect(loaded.pendingOffline?.contracts).toBe(3);
    loaded.pendingOffline = null;
    save.save(loaded);
    expect(save.load().state!.pendingOffline).toBeNull();
  });
});
