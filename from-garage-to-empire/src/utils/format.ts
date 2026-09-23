export function formatNumber(value: number, locale = 'pt-BR'): string {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat(locale, {
    notation: magnitude >= 1e15 ? 'scientific' : magnitude >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: magnitude >= 10000 ? 2 : magnitude < 10 ? 1 : 0,
  }).format(value);
}
export function money(value: number, locale = 'pt-BR'): string {
  return `R$ ${formatNumber(value, locale)}`;
}
