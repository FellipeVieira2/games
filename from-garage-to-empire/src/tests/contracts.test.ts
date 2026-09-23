import { describe, expect, it } from 'vitest';
import { newGame } from '../core/state';
import { canSelectProject, projectRequirements } from '../core/progression';
import { selectContract, tick } from '../core/economy';
import { projects } from '../config/balance';
import { renderContracts } from '../ui/contracts';

describe('project progression', () => {
  it('cannot skip directly to the app with money and reputation alone', () => {
    const s = newGame();
    s.money = 1e9;
    s.reputation = 10000;
    expect(selectContract(s, 'app')).toBe(false);
    expect(selectContract(s, 'shop')).toBe(false);
    expect(selectContract(s, 'restaurant')).toBe(false);
    expect(s.project).toBe('landing');
    expect(s.queuedProject).toBeNull();
  });
  it('requires prior deliveries even with an experienced team and coworking', () => {
    const s = newGame();
    s.office = 2;
    s.reputation = 1000;
    s.employees = [1, 2, 3].map((id) => ({ id, level: 10 }));
    expect(canSelectProject(s, 'app')).toBe(false);
    s.contractHistory.shop = 2;
    expect(canSelectProject(s, 'app')).toBe(false);
    s.contractHistory.shop = 3;
    expect(canSelectProject(s, 'app')).toBe(true);
  });
  it('requires two individually qualified developers for a shop, not one high-level carry', () => {
    const s = newGame();
    s.office = 1;
    s.reputation = 20;
    s.contractHistory.restaurant = 3;
    s.employees = [
      { id: 1, level: 10 },
      { id: 2, level: 1 },
    ];
    expect(canSelectProject(s, 'shop')).toBe(false);
    s.employees[1]!.level = 2;
    expect(canSelectProject(s, 'shop')).toBe(true);
    s.office = 0;
    expect(canSelectProject(s, 'shop')).toBe(false);
  });
  it('credits delivery history for offline batches and when changing contracts', () => {
    const s = newGame();
    s.reputation = 5;
    s.completed = 3;
    s.contractHistory.landing = 3;
    s.progress = 90;
    s.employees = [{ id: 1, level: 1 }];
    expect(selectContract(s, 'restaurant')).toBe(true);
    tick(s, 322, true);
    expect(s.contractHistory.landing).toBe(4);
    expect(s.contractHistory.restaurant).toBe(2);
    expect(s.completed).toBe(6);
  });
  it('keeps advanced work substantial even after first hardware upgrades', () => {
    const app = projects.find((p) => p.id === 'app')!,
      shop = projects.find((p) => p.id === 'shop')!;
    expect(app.work).toBeGreaterThan(shop.work * 4);
    expect(app.work / (3 * 3 * 5 * 1.3 + 12)).toBeGreaterThan(240);
  });
  it('explains every blocker in the contract UI and disables acceptance', () => {
    const s = newGame();
    const html = renderContracts(s);
    expect(projectRequirements(s, 'app').filter((r) => !r.met)).toHaveLength(4);
    expect(html).toContain('3 dev(s) no nível 3');
    expect(html).toContain('Sede: Coworking');
    expect(html).toContain('Entregar 3 × Loja virtual');
    expect(html).toMatch(/data-id="app" disabled/);
  });
});
