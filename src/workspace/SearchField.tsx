"use client";

import type { Ref } from 'react';
import { useLocale } from '@/i18n/context';
import './search-field.css';

export default function SearchField({ label, value, onChange, placeholder, className = '', inputRef }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const { t } = useLocale();
  return <div className={`inflow-search-field ${className}`.trim()}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
    <input ref={inputRef} type="search" aria-label={label} value={value} placeholder={placeholder} onChange={event => onChange(event.currentTarget.value)}/>
    {value && <button type="button" className="inflow-search-clear" aria-label={t("Clear search")} onClick={event => {
      onChange('');
      event.currentTarget.parentElement?.querySelector('input')?.focus();
    }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg>
    </button>}
  </div>;
}
