"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { isInterfaceLocale, localizedError, resolveLocale, translate, type InterfaceLocale, type MessageValues } from './index';

const storageKey = 'inflow.interfaceLocale';
const LocaleContext = createContext<{
  locale: InterfaceLocale;
  t: (key: string, values?: MessageValues) => string;
  error: (failure: unknown, fallbackKey: string) => string;
  saveLocale: (locale: InterfaceLocale) => Promise<import('../listening/desktop').ApplicationSettings | undefined>;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<InterfaceLocale>('en');
  useEffect(() => {
    let current = true;
    if (window.inflow) {
      window.inflow.getSettings().then(settings => { if (current) setLocale(resolveLocale(settings.interfaceLocale, navigator.language)); }).catch(() => {});
    } else {
      let saved: string | null = null;
      try { saved = localStorage.getItem(storageKey); } catch {}
      Promise.resolve().then(() => { if (current) setLocale(resolveLocale(saved, navigator.language)); });
    }
    return () => { current = false; };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const saveLocale = useCallback(async (next: InterfaceLocale) => {
    if (!isInterfaceLocale(next)) throw new Error('host.invalidLocale');
    const settings = window.inflow ? await window.inflow.saveSettings({ interfaceLocale: next }) : undefined;
    if (!window.inflow) localStorage.setItem(storageKey, next);
    setLocale(next);
    return settings;
  }, []);
  const t = useCallback((key: string, values?: MessageValues) => translate(locale, key, values), [locale]);
  const error = useCallback((failure: unknown, fallbackKey: string) => localizedError(locale, failure, fallbackKey), [locale]);
  return <LocaleContext.Provider value={{ locale, t, error, saveLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('LocaleProvider is required.');
  return context;
}
