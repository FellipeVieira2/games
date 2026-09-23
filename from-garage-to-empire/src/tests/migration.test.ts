import { expect, it } from 'vitest';
import { newGame } from '../core/state';
import {
  migrate,
  LocalSaveService,
  SAVE_KEY,
  BACKUP_KEY,
  LEGACY_BACKUP_KEY,
} from '../storage/save';
import { tick } from '../core/economy';
import { canSelectProject } from '../core/progression';

function oldSave() {
  const { contractHistory: _history, legacyContract: _legacy, ...s } = newGame(1000);
  void _history;
  void _legacy;
  return {
    ...s,
    saveVersion: 1,
    money: 23450,
    completed: 90,
    reputation: 150,
    project: 'app',
    progress: 1200,
    office: 1,
    employees: [{ id: 1, level: 4 }],
    queuedProject: 'shop',
  };
}
it('migrates a v1 save preserving assets and contract percentage without inventing history', () => {
  const old = oldSave(),
    s = migrate(old);
  expect(s.saveVersion).toBe(10);
  expect(s.money).toBe(old.money);
  expect(s.employees).toEqual(old.employees);
  expect(s.progress).toBe(11000);
  expect(s.legacyContract).toBe('app');
  expect(s.queuedProject).toBeNull();
  expect(s.completed).toBe(90);
  expect(s.contractHistory).toEqual({ landing: 0, restaurant: 0, shop: 0, app: 0 });
  expect(migrate(s)).toEqual(s);
});
it('allows the legacy delivery exactly once, including offline, then respects new gates', () => {
  const s = migrate(oldSave());
  tick(s, 1000, true);
  expect(s.legacyContract).toBeNull();
  expect(s.project).toBe('landing');
  expect(s.contractHistory.app).toBe(1);
  expect(canSelectProject(s, 'app')).toBe(false);
  expect(s.money).toBeGreaterThan(23450);
  const count = s.contractHistory.app;
  tick(s, 1000, true);
  expect(s.contractHistory.app).toBe(count);
});
it('archives the original v1 save before replacing it and never overwrites that archive', () => {
  const raw = JSON.stringify(oldSave());
  const data = new Map([[SAVE_KEY, raw]]);
  const saves = new LocalSaveService({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  });
  const loaded = saves.load();
  expect(loaded.issue).toBe('migrated');
  expect(saves.save(loaded.state!)).toBe(true);
  expect(data.get(LEGACY_BACKUP_KEY)).toBe(raw);
  const s = loaded.state!;
  s.money++;
  saves.save(s);
  expect(data.get(LEGACY_BACKUP_KEY)).toBe(raw);
});
it('rejects malformed v1 progress before migration and invalid v2 histories', () => {
  expect(() => migrate({ ...oldSave(), progress: 2400 })).toThrow();
  const s = newGame();
  s.contractHistory.app = 4;
  expect(() => migrate(s)).toThrow();
});
it('leaves v1 data intact if the archival write fails', () => {
  const raw = JSON.stringify(oldSave());
  const data = new Map([[SAVE_KEY, raw]]);
  const saves = new LocalSaveService({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (k === LEGACY_BACKUP_KEY) throw new Error('quota');
      data.set(k, v);
    },
  });
  const state = saves.load().state!;
  expect(saves.save(state)).toBe(false);
  expect(data.get(SAVE_KEY)).toBe(raw);
});

it('archives a recovered v1 backup before subsequent saves rotate that backup', () => {
  const raw = JSON.stringify(oldSave());
  const data = new Map([
    [SAVE_KEY, '{broken'],
    [BACKUP_KEY, raw],
  ]);
  const saves = new LocalSaveService({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
  const loaded = saves.load();
  expect(loaded.issue).toBe('backup');
  expect(saves.save(loaded.state!)).toBe(true);
  expect(saves.save(loaded.state!)).toBe(true);
  expect(data.get(LEGACY_BACKUP_KEY)).toBe(raw);
  expect(JSON.parse(data.get(BACKUP_KEY)!).saveVersion).toBe(10);
});
