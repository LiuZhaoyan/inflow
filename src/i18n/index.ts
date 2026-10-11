import * as settings from './settings';
import * as renderer from './renderer';
import * as host from './host';

export type InterfaceLocale = 'zh-CN' | 'en';
export type MessageValues = Record<string, string | number>;
export type MessageCatalog = Record<InterfaceLocale, Record<string, string>>;
export const dictionaries: MessageCatalog = {
  en: { ...settings.en, ...renderer.en, ...host.en },
  'zh-CN': { ...settings.zhCN, ...renderer.zhCN, ...host.zhCN },
};
export function isInterfaceLocale(value: unknown): value is InterfaceLocale { return value === 'zh-CN' || value === 'en'; }
export function resolveLocale(saved: unknown, system: string): InterfaceLocale {
  return isInterfaceLocale(saved) ? saved : /^zh(?:[-_]|$)/i.test(system) ? 'zh-CN' : 'en';
}
export function translate(locale: InterfaceLocale, key: string, values: MessageValues = {}, catalog = dictionaries): string {
  return (catalog[locale][key] ?? catalog.en[key] ?? key).replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
export function localizedError(locale: InterfaceLocale, failure: unknown, fallbackKey: string): string {
  const original = failure instanceof Error ? failure.message : typeof failure === 'string' ? failure : '';
  const detail = original.replace(/^Error invoking remote method 'inflow:[^']+': Error: /, '');
  const key = Object.hasOwn(dictionaries.en, detail) ? detail : Object.keys(dictionaries.en).find(key => dictionaries.en[key] === detail || dictionaries['zh-CN'][key] === detail);
  if (key) return translate(locale, key);
  const guidance = translate(locale, fallbackKey);
  if (!guidance) return detail;
  return detail && detail !== guidance ? `${guidance} ${detail}` : guidance;
}
