"use client";

import { useEffect, useRef } from 'react';
import type { SourceLanguage } from '@/listening/desktop';
import { useLocale } from '@/i18n/context';
import './source-language-dialog.css';

const languages: { code: SourceLanguage; name: string }[] = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
];

export default function SourceLanguageDialog({ onSelect, onCancel }: {
  onSelect: (language: SourceLanguage) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    element.focus({ preventScroll: true });
    return () => { if (element.open) element.close(); };
  }, []);

  return <dialog ref={dialog} tabIndex={-1} className="workspace-source-language-dialog"
    aria-labelledby="source-language-title" aria-describedby="source-language-description"
    onCancel={event => { event.preventDefault(); onCancel(); }}>
    <header>
      <h2 id="source-language-title">{t('Choose source language')}</h2>
      <button type="button" className="workspace-source-language-close" onClick={onCancel}
        aria-label={t('Close language selection')} title={t('Close language selection')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg>
      </button>
    </header>
    <p id="source-language-description">{t('Select the language spoken in this media. Translations will remain in Chinese.')}</p>
    <div className="workspace-source-language-options" role="group" aria-label={t('Choose source language')}>
      {languages.map(language => <button type="button" key={language.code} lang={language.code}
        className="workspace-source-language-option" onClick={() => onSelect(language.code)}>
        <span>{language.name}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </button>)}
    </div>
    <footer>
      <span>{t('Esc to cancel')}</span>
      <button type="button" className="workspace-source-language-cancel" onClick={onCancel}>{t('Cancel')}</button>
    </footer>
  </dialog>;
}
