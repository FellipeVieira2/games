import { expect, it } from 'vitest';
import { formatNumber, money } from '../utils/format';
import pt from '../i18n/pt-BR.json';
import en from '../i18n/en-US.json';
it('formats local numbers and compacts millions and trillions', () => {
  expect(formatNumber(1250)).toBe('1.250');
  expect(money(42)).toBe('R$ 42');
  expect(formatNumber(2.4e6)).toContain('mi');
  expect(formatNumber(1.2e12).length).toBeLessThan(12);
  expect(formatNumber(Infinity)).toBe('—');
  expect(formatNumber(1.2e6, 'en-US')).toContain('M');
  expect(formatNumber(12500)).toContain('12,5');
  expect(formatNumber(1.23e12)).toContain('1,23');
  expect(formatNumber(1e100).length).toBeLessThan(10);
});
it('keeps catalogs and interpolation placeholders in sync', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
  for (const key of Object.keys(pt) as (keyof typeof pt)[])
    expect(en[key].match(/\{\w+\}/g)?.sort()).toEqual(pt[key].match(/\{\w+\}/g)?.sort());
});
