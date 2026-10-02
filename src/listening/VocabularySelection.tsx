"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import CloudCredential from './CloudCredential';
import type { SaveVocabularyInput, SourceLanguage } from './desktop';

type Context = NonNullable<SaveVocabularyInput['context']>;
type Draft = {
  key: string; context: Context; language: SourceLanguage; start: number; range: Range;
  lemma: string; meaningZh: string; edited: boolean; lemmaEdited: boolean;
  loading: boolean; saving: boolean; lookupError: string; error: string;
  candidates: string[]; meaningEdited: boolean; revision: number; cloudLoading: boolean; suggestion: string;
};
export type VocabularySelectionHandle = { beforeChange: () => boolean };

export default function VocabularySelection({ ref, active, getContext, onOpen, onSaved }: {
  ref: Ref<VocabularySelectionHandle>; active: boolean;
  getContext: (element: HTMLElement) => { context: Context; language: SourceLanguage } | null;
  onOpen: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const [position, setPosition] = useState({ top: 12, left: 12, maxHeight: 300 });
  const current = useRef<Draft | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const lookupJob = useRef<string | null>(null);
  const cloudJob = useRef<string | null>(null);

  function update(next: Draft | null) { current.current = next; setDraft(next); }
  function close() {
    for (const job of [lookupJob.current, cloudJob.current]) if (job) void window.inflow?.cancel(job).catch(() => {});
    lookupJob.current = null; cloudJob.current = null;
    update(null); setNotice('');
  }
  function beforeChange() {
    const previous = current.current;
    if (previous?.saving || previous?.edited) {
      update({ ...previous, error: previous.saving ? 'Saving vocabulary…' : 'Save or discard this edited word before continuing.' });
      return false;
    }
    close(); return true;
  }
  useImperativeHandle(ref, () => ({ beforeChange }));

  useEffect(() => {
    if (!active) return;
    let dragging = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function place(range: Range) {
      const rect = range.getBoundingClientRect();
      const height = Math.min(500, window.innerHeight - 24);
      const preferred = rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 8 : rect.top - height - 8;
      const top = Math.max(12, Math.min(preferred, window.innerHeight - height - 12));
      setPosition({ top, left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)), maxHeight: window.innerHeight - top - 12 });
    }
    function capture() {
      if (popup.current?.contains(document.activeElement)) return;
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const parent = (node: Node | null | undefined) => node instanceof Element ? node : node?.parentElement;
      const startElement = parent(range?.startContainer)?.closest<HTMLElement>('.workspace-sentence-text, .artifact-korean');
      const endElement = parent(range?.endContainer)?.closest<HTMLElement>('.workspace-sentence-text, .artifact-korean');
      if (!selection || selection.isCollapsed || !range || !startElement || !endElement || startElement.closest('[hidden]')) {
        beforeChange(); return;
      }
      if (startElement !== endElement) {
        if (beforeChange()) { place(range); setNotice('Select a word inside one revealed sentence.'); }
        return;
      }
      const text = selection.toString();
      const surface = text.trim();
      const source = getContext(startElement);
      if (!source || !surface || range.cloneContents().querySelector('.hidden-group') || parent(range.startContainer)?.closest('.hidden-group') || parent(range.endContainer)?.closest('.hidden-group')) {
        if (beforeChange()) setNotice('Select a word inside one revealed sentence.');
        return;
      }
      if (surface.length > 100 || /\s/u.test(surface)) {
        if (beforeChange()) { place(range); setNotice('Please narrow the selection to one word (up to 100 characters).'); }
        return;
      }
      const origin = parent(range.startContainer)?.closest<HTMLElement>('[data-source-start]') ?? startElement;
      const prefix = document.createRange();
      prefix.selectNodeContents(origin); prefix.setEnd(range.startContainer, range.startOffset);
      const start = Number(origin.dataset.sourceStart ?? 0) + prefix.toString().length + text.length - text.trimStart().length;
      if (source.context.sentence.slice(start, start + surface.length) !== surface) {
        if (beforeChange()) { place(range); setNotice('Select a word inside one revealed sentence.'); }
        return;
      }
      if (current.current?.start === start && current.current.context.sentence === source.context.sentence &&
        JSON.stringify(current.current.context.source) === JSON.stringify(source.context.source) && current.current.context.surface === surface) return;
      if (!beforeChange()) return;
      const next: Draft = { key: crypto.randomUUID(), context: { ...source.context, surface }, language: source.language,
        start, range: range.cloneRange(), lemma: surface, meaningZh: '', edited: false, lemmaEdited: false,
        loading: true, saving: false, lookupError: '', error: '',
        candidates: [], meaningEdited: false, revision: 0, cloudLoading: false, suggestion: '' };
      place(range); update(next); onOpen();
      loadLookup(next);
    }
    function schedule() { clearTimeout(timer); if (!dragging) timer = setTimeout(capture, 150); }
    function pointerDown(event: PointerEvent) { dragging = !popup.current?.contains(event.target as Node); }
    function pointerUp() { dragging = false; schedule(); }
    function reposition() { if (current.current) place(current.current.range); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') beforeChange(); }
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointerup', pointerUp);
    document.addEventListener('keydown', escape);
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('pointerdown', pointerDown);
      document.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  });
  useEffect(() => () => { for (const job of [lookupJob.current, cloudJob.current]) if (job) void window.inflow?.cancel(job).catch(() => {}); }, []);

  function change(fields: Partial<Draft>) {
    const latest = current.current;
    if (!latest) return;
    update({ ...latest, ...fields, edited: true, revision: latest.revision + 1, suggestion: '', error: '',
      ...(fields.meaningZh !== undefined ? { meaningEdited: true } : {}) });
  }

  function loadLookup(entry: Draft, lemma?: string) {
    if (lookupJob.current) void window.inflow!.cancel(lookupJob.current).catch(() => {});
    const job = crypto.randomUUID(); lookupJob.current = job;
    update({ ...entry, loading: true, lookupError: '' });
    void window.inflow!.lookupVocabulary({ surface: entry.context.surface, sentence: entry.context.sentence,
      start: entry.start, language: entry.language, source: entry.context.source, ...(lemma ? { lemma } : {}) }, job).then(result => {
      const latest = current.current;
      if (latest?.key !== entry.key || lookupJob.current !== job) return;
      lookupJob.current = null;
      if (latest.lemmaEdited && latest.lemma !== result.lemma) { update({ ...latest, loading: false }); return; }
      const candidates = result.candidates ?? [];
      update({ ...latest, loading: false, lemma: result.lemma, candidates,
        meaningZh: latest.meaningEdited ? latest.meaningZh : result.meaningZh ?? '' });
    }).catch(failure => {
      const latest = current.current;
      if (latest?.key !== entry.key || lookupJob.current !== job) return;
      lookupJob.current = null;
      update({ ...latest, loading: false, lookupError: failure instanceof Error ? failure.message : 'Lookup failed. Enter it manually.' });
    });
  }

  async function requestGloss() {
    const entry = current.current;
    if (!entry || entry.cloudLoading || entry.saving) return;
    const job = crypto.randomUUID(); cloudJob.current = job;
    update({ ...entry, cloudLoading: true, suggestion: '', error: '' });
    try {
      const meaning = await window.inflow!.glossVocabulary({ surface: entry.context.surface, sentence: entry.context.sentence,
        start: entry.start, language: entry.language, source: entry.context.source, lemma: entry.lemma }, job);
      const latest = current.current;
      if (latest?.key !== entry.key || cloudJob.current !== job) return;
      if (latest.lemma !== entry.lemma) { update({ ...latest, cloudLoading: false }); return; }
      if (latest.revision !== entry.revision) update({ ...latest, cloudLoading: false, suggestion: meaning });
      else update({ ...latest, cloudLoading: false, meaningZh: meaning, meaningEdited: true, edited: true, revision: latest.revision + 1 });
    } catch (failure) {
      const latest = current.current;
      if (latest?.key === entry.key && cloudJob.current === job) update({ ...latest, cloudLoading: false, error: failure instanceof Error ? failure.message : 'Cloud lookup failed. You can keep editing.' });
    } finally { if (cloudJob.current === job) cloudJob.current = null; }
  }

  async function save() {
    const entry = current.current;
    if (!entry || entry.saving || (entry.loading && !entry.lemmaEdited)) return;
    update({ ...entry, saving: true, error: '' });
    try {
      await window.inflow!.saveVocabulary({ lemma: entry.lemma, meaningZh: entry.meaningZh, language: entry.language, context: { ...entry.context, surfaceStart: entry.start } });
      close(); window.getSelection()?.removeAllRanges(); onSaved();
    } catch (failure) {
      const latest = current.current;
      if (latest?.key === entry.key) update({ ...latest, saving: false, error: failure instanceof Error ? failure.message : 'Save failed. Please try again.' });
    }
  }

  if (!active || (!draft && !notice)) return null;
  return <div ref={popup} className="vocabulary-selection" role="dialog" aria-label="Collect a word" style={position}>
    {draft ? <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <header><strong lang={draft.language}>{draft.context.surface}</strong><button type="button" aria-label="Close word collection" disabled={draft.saving} onClick={beforeChange}>×</button></header>
      <small>{draft.context.source.name}</small>
      <fieldset disabled={draft.saving}>
        <label>Dictionary form<input name="lemma" lang={draft.language} value={draft.lemma} required maxLength={100} onChange={event => { const previous = current.current!; change({ lemma: event.target.value, lemmaEdited: true, candidates: [] }); if (!previous.meaningEdited) update({ ...current.current!, meaningZh: '' }); }} onBlur={() => { if (current.current?.lemmaEdited && current.current.lemma.trim()) loadLookup(current.current, current.current.lemma.trim()); }}/></label>
        <label>Chinese meaning<input name="meaningZh" lang="zh" value={draft.meaningZh} required maxLength={300} onChange={event => change({ meaningZh: event.target.value })}/></label>
        {!!draft.candidates.length && <label>Dictionary meanings<select aria-label="Dictionary meanings" value="" onChange={event => { if (event.target.value) change({ meaningZh: event.target.value }); }}>
          <option value="">Choose a meaning</option>{draft.candidates.map(meaning => <option key={meaning} value={meaning}>{meaning}</option>)}
        </select></label>}
        <small>KRDict · National Institute of Korean Language · CC BY-SA 2.0 KR</small>
        {!draft.loading && !draft.candidates.length && <p>No offline meaning found. Enter one or request a cloud meaning.</p>}
        <button type="button" disabled={draft.cloudLoading || !draft.lemma.trim() || (draft.loading && !draft.lemmaEdited)} onClick={() => void requestGloss()}>Get contextual meaning · LLM</button>
        {draft.cloudLoading && <p role="status">Looking up meaning… <button type="button" onClick={() => { if (cloudJob.current) void window.inflow!.cancel(cloudJob.current).catch(() => {}); cloudJob.current = null; update({ ...current.current!, cloudLoading: false }); }}>Cancel lookup</button></p>}
        {draft.suggestion && <p lang="zh">LLM suggestion: {draft.suggestion} <button type="button" onClick={() => change({ meaningZh: draft.suggestion })}>Apply suggestion</button></p>}
        <CloudCredential/>
        {draft.loading && <p role="status">Finding dictionary form…</p>}
        {draft.lookupError && <p role="status">{draft.lookupError} You can enter it manually.</p>}
        <footer><button className="workspace-primary-button" type="submit" disabled={draft.loading && !draft.lemmaEdited}>{draft.saving ? 'Saving…' : '+ Save vocabulary'}</button><button type="button" onClick={() => { close(); window.getSelection()?.removeAllRanges(); }}>Discard</button></footer>
      </fieldset>
      {draft.error && <p role="alert">{draft.error}</p>}
    </form> : <><p role="status">{notice}</p><button type="button" onClick={close}>Close</button></>}
  </div>;
}
