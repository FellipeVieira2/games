import pt from './pt-BR.json';
import en from './en-US.json';
export type TextKey = keyof typeof pt;
export type Locale = 'pt-BR' | 'en-US';
const catalogs: Record<Locale, Record<TextKey, string>> = { 'pt-BR': pt, 'en-US': en };
export function translate(
  locale: Locale,
  key: TextKey,
  params: Record<string, string | number> = {},
): string {
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    catalogs[locale][key],
  );
}
