"use client";

import { useEffect, useRef, useState } from 'react';
import type { VocabularyEntry } from '@/listening/desktop';

export default function StoryTargetsDialog({ entries, onClose, onConfirm }: {
  entries: VocabularyEntry[]; onClose: () => void;
  onConfirm: (ids: string[]) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ids, setIds] = useState<string[]>(() => entries.filter(entry => entry.selected).map(entry => entry.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mixedLanguageSelection = new Set(entries.filter(entry => ids.includes(entry.id)).map(entry => entry.language)).size > 1;
  const languageName = (language: VocabularyEntry['language']) => language === 'en' ? 'English' : 'Korean';
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
  }, []);

  return <dialog ref={dialog} className="workspace-target-dialog" aria-labelledby="story-target-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
    <form onSubmit={event => {
      event.preventDefault(); setBusy(true); setError('');
      void onConfirm(ids).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not select vocabulary. Please retry.')).finally(() => setBusy(false));
    }}>
      <header><div><h2 id="story-target-title">Choose story vocabulary</h2><p>Select 1–20 words in one source language for a story.</p></div><button type="button" aria-label="Close vocabulary selection" disabled={busy} onClick={onClose}>×</button></header>
      <fieldset disabled={busy}>
        <div className="workspace-target-list">{entries.map(entry => <label key={entry.id}>
          <input type="checkbox" checked={ids.includes(entry.id)} disabled={!ids.includes(entry.id) && ids.length >= 20} onChange={event => setIds(previous => event.target.checked ? [...previous, entry.id] : previous.filter(id => id !== entry.id))}/>
          <span className="workspace-target-word"><strong lang={entry.language}>{entry.lemma}</strong><small className="workspace-language-badge">{languageName(entry.language)}</small></span><span>{entry.meaningZh}</span>
        </label>)}</div>
        {mixedLanguageSelection && <p className="workspace-target-language-warning" role="status">Choose vocabulary in one source language before generating. Your current selection is preserved.</p>}
        {!entries.length && <p className="workspace-empty">Collect or add vocabulary before generating a story.</p>}
        <footer><span>{ids.length} / 20 selected</span><button type="submit" className="workspace-generate-button" disabled={!ids.length}>Continue</button></footer>
      </fieldset>
      {error && <p className="workspace-notice" role="alert">{error}</p>}
    </form>
  </dialog>;
}
