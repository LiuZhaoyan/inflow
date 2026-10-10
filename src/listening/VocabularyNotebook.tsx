"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { SaveVocabularyInput, SourceLanguage, VocabularyContext, VocabularyEntry } from './desktop';
import SourceThumbnail from '@/workspace/SourceThumbnail';
import '@/workspace/vocab.css';

type VocabularyDraft = {
  key: string; id?: string; language?: SaveVocabularyInput['language']; lemma: string; meaningZh: string;
};

export type VocabularyNotebookHandle = { beforeChange: () => boolean; open: (id: string) => Promise<boolean> };

function Pronunciation({ entry, active }: { entry: VocabularyEntry; active: boolean }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
  const [ready, setReady] = useState(voices.length > 0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => { const next = synth.getVoices(); setVoices(next); if (next.length) setReady(true); };
    const timer = window.setTimeout(() => { update(); setReady(true); }, 5000);
    synth.addEventListener('voiceschanged', update);
    return () => {
      clearTimeout(timer); synth.removeEventListener('voiceschanged', update);
      if (utterance.current) { utterance.current = null; synth.cancel(); setSpeaking(false); }
    };
  }, [active]);
  const language = entry.language === 'en' ? 'English' : 'Korean';
  const matching = voices.filter(voice => voice.localService && voice.lang.split('-')[0] === entry.language);
  const voice = matching.find(voice => voice.default) ?? matching[0];
  function speak() {
    const synth = window.speechSynthesis;
    if (utterance.current) { utterance.current = null; synth.cancel(); setSpeaking(false); return; }
    if (!voice) return;
    const next = new SpeechSynthesisUtterance(entry.lemma);
    next.voice = voice; next.lang = voice.lang;
    next.onend = () => { if (utterance.current === next) { utterance.current = null; setSpeaking(false); } };
    next.onerror = event => {
      if (utterance.current !== next) return;
      utterance.current = null; setSpeaking(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') setError('Pronunciation failed. Please try again.');
    };
    utterance.current = next; setError(''); setSpeaking(true); synth.speak(next);
  }
  const unavailable = typeof window === 'undefined' || !window.speechSynthesis ? 'System pronunciation is unavailable.' : !ready ? 'Loading system voices…' : `Install a ${language} system voice to use pronunciation.`;
  return <span className="vocab-pronunciation-control">
    <button className="vocab-pronunciation" type="button" disabled={!voice || !active} aria-pressed={speaking} title={voice ? `Read dictionary form with ${voice.name}` : unavailable} aria-label={speaking ? 'Stop pronunciation' : voice ? 'Pronounce dictionary form' : unavailable} onClick={speak}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a5 5 0 0 1 0 6M17.5 6.5a9 9 0 0 1 0 11"/></svg>
    </button>
    {error && <span className="vocab-pronunciation-error" role="alert">{error}</span>}
    {ready && !voice && <span className="vocab-pronunciation-error" role="status">{unavailable}</span>}
  </span>;
}

function VocabularyEditor({ draft, busy, active, onSave, onCancel }: {
  draft: VocabularyDraft; busy: boolean; active: boolean; onSave: (input: SaveVocabularyInput) => Promise<void>; onCancel: () => void;
}) {
  const [lemma, setLemma] = useState(draft.lemma);
  const [meaning, setMeaning] = useState(draft.meaningZh);
  const [language, setLanguage] = useState<SourceLanguage>(draft.language ?? 'ko');
  const [error, setError] = useState('');
  return <form className="vocab-editor" aria-label="Edit vocabulary" onSubmit={event => {
    event.preventDefault(); setError('');
    void onSave({ id: draft.id, language, lemma, meaningZh: meaning })
      .catch(failure => setError(failure instanceof Error ? failure.message : 'Save failed. Please try again.'));
  }}>
    <h2>{draft.id ? 'Edit vocabulary' : 'Add vocabulary'}</h2>
    <fieldset disabled={busy}>
      {draft.id ? <p className="vocab-editor-language"><span className="vocab-language-badge">{language === 'en' ? 'English' : 'Korean'}</span></p> : <label>Confirm source language<select name="language" value={language} onChange={event => setLanguage(event.target.value as SourceLanguage)}><option value="ko">Korean</option><option value="en">English</option></select></label>}
      <label>Dictionary form<input autoFocus={active} name="lemma" lang={language} value={lemma} maxLength={100} required onChange={event => setLemma(event.target.value)}/></label>
      <label>Chinese meaning<input name="meaningZh" lang="zh" value={meaning} maxLength={300} required onChange={event => setMeaning(event.target.value)}/></label>
      <div className="vocab-editor-actions"><button className="vocab-primary" type="submit">{busy ? 'Saving…' : 'Save vocabulary'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
    {error && <p className="vocab-error" role="alert">{error}</p>}
  </form>;
}

type Filter = 'all' | 'media' | 'stories' | 'manual';
type LanguageFilter = 'all' | SourceLanguage;

function formatTime(value: number) {
  return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
}

function isMedia(entry: VocabularyEntry) {
  return entry.contexts.some(context => context.source.type === 'media');
}

function isStory(entry: VocabularyEntry) {
  return entry.contexts.some(context => context.source.type === 'artifact');
}

function matchesFilter(entry: VocabularyEntry, filter: Filter) {
  if (filter === 'media') return isMedia(entry);
  if (filter === 'stories') return isStory(entry);
  if (filter === 'manual') return entry.contexts.length === 0;
  return true;
}

function location(source: VocabularyContext['source']) {
  return source.type === 'media' ? formatTime(source.start) : 'Sentence ' + (source.sentenceIndex + 1);
}

function HighlightedSentence({ sentence, surface, surfaceStarts }: VocabularyContext) {
  // shortcut: legacy contexts have no offsets, recollect them for exact occurrence highlighting.
  const starts = surfaceStarts ?? (surface && sentence.includes(surface) ? [sentence.indexOf(surface)] : []);
  const ranges: { start: number; end: number }[] = [];
  for (const start of starts) {
    const previous = ranges.at(-1), end = start + surface.length;
    if (previous && start <= previous.end) previous.end = Math.max(previous.end, end);
    else ranges.push({ start, end });
  }
  let end = 0;
  const parts = ranges.map(range => {
    const before = sentence.slice(end, range.start); end = range.end;
    return <span key={range.start}>{before}<mark>{sentence.slice(range.start, end)}</mark></span>;
  });
  return <>{parts}{sentence.slice(end)}</>;
}

function matchesQuery(entry: VocabularyEntry, query: string) {
  return !query || [entry.lemma, entry.meaningZh, ...entry.contexts.flatMap(context => [
    context.surface, context.sentence, context.source.name,
  ])].some(value => value.toLocaleLowerCase().includes(query));
}

function thumbnailKey(source: VocabularyContext['source']) {
  return source.type === 'media' ? source.mediaId + ':' + source.segmentId : source.artifactId + ':' + source.sentenceIndex;
}

export default function VocabularyNotebook({
  refreshKey, onOpenSource, onGenerateStory, onEntriesChange,
  onEditingChange, active = true, ref,
}: {
  ref?: Ref<VocabularyNotebookHandle>;
  refreshKey: number;
  onOpenSource: (source: VocabularyContext['source']) => void;
  onGenerateStory: (entries: VocabularyEntry[]) => void;
  onEntriesChange?: (entries: VocabularyEntry[]) => void;
  onEditingChange?: (editing: boolean) => void;
  active?: boolean;
}) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VocabularyDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [noteDraft, setNoteDraft] = useState<{ id: string; note: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const draft = editing;
  const noteDirty = Boolean(noteDraft && noteDraft.note !== (entries.find(entry => entry.id === noteDraft.id)?.note ?? ''));
  const hasPendingEdit = Boolean(draft) || busy || noteDirty;

  useEffect(() => {
    let current = true;
    const version = ++requestVersion.current;
    window.inflow!.listVocabulary().then(result => {
      if (!current || version !== requestVersion.current) return;
      setEntries(result); setSelectedId(previous => result.some(entry => entry.id === previous) ? previous : result[0]?.id ?? null);
      setLoaded(true); setLoading(false); setLoadError(''); onEntriesChange?.(result);
    }).catch(failure => {
      if (current && version === requestVersion.current) { setLoaded(true); setLoading(false); setLoadError(failure instanceof Error ? failure.message : 'Could not load vocabulary.'); }
    });
    return () => { current = false; };
  }, [onEntriesChange, refreshKey, reloadKey]);

  useEffect(() => { onEditingChange?.(hasPendingEdit); }, [hasPendingEdit, onEditingChange]);
  useEffect(() => {
    if (active && draft) document.querySelector<HTMLInputElement>('#notebook input[name="lemma"]')?.focus();
  }, [active, draft]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEntries = entries.filter(entry => matchesFilter(entry, filter) &&
    (languageFilter === 'all' || entry.language === languageFilter) && matchesQuery(entry, normalizedQuery));
  const selectedEntry = visibleEntries.find(entry => entry.id === selectedId) ?? visibleEntries[0] ?? null;
  const counts = {
    all: entries.length,
    media: entries.filter(isMedia).length,
    stories: entries.filter(isStory).length,
    manual: entries.filter(entry => entry.contexts.length === 0).length,
  };
  const languageCounts = {
    all: entries.length,
    ko: entries.filter(entry => entry.language === 'ko').length,
    en: entries.filter(entry => entry.language === 'en').length,
  };

  function beforeChange() {
    if (noteDirty || busy) { setError(noteDirty ? 'Save or cancel the current note before continuing.' : 'Saving vocabulary…'); return false; }
    setNoteDraft(null); return true;
  }
  function reveal(entry: VocabularyEntry) {
    setSelectedId(entry.id);
    if (!matchesFilter(entry, filter)) setFilter('all');
    if (languageFilter !== 'all' && entry.language !== languageFilter) setLanguageFilter(entry.language);
    if (!matchesQuery(entry, normalizedQuery)) setQuery('');
  }
  async function open(id: string) {
    if (!beforeChange()) return false;
    const version = ++requestVersion.current;
    try {
      const next = await window.inflow!.listVocabulary();
      if (version !== requestVersion.current || !beforeChange()) return false;
      setEntries(next); setLoaded(true); setLoadError(''); onEntriesChange?.(next);
      const entry = next.find(item => item.id === id);
      if (!entry) throw new Error('This word is no longer in your vocabulary notebook. Its saved story is still available.');
      setError(''); reveal(entry);
      return true;
    } catch (failure) {
      if (version === requestVersion.current) setLoaded(true);
      throw failure;
    } finally { if (version === requestVersion.current) setLoading(false); }
  }
  useImperativeHandle(ref, () => ({ beforeChange, open }));
  function dismiss() { setEditing(null); setNoteDraft(null); }
  function editEntry(entry: VocabularyEntry) {
    setEditing({ key: crypto.randomUUID(), id: entry.id, language: entry.language, lemma: entry.lemma, meaningZh: entry.meaningZh });
  }
  function addEntry() {
    setEditing({ key: crypto.randomUUID(), language: languageFilter === 'all' ? selectedEntry?.language ?? 'ko' : languageFilter, lemma: '', meaningZh: '' });
  }
  async function save(input: SaveVocabularyInput) {
    setBusy(true); setError('');
    try {
      const saved = await window.inflow!.saveVocabulary(input);
      requestVersion.current++;
      const next = entries.some(entry => entry.id === saved.id) ? entries.map(entry => entry.id === saved.id ? saved : entry) : [saved, ...entries];
      setEntries(next); reveal(saved); setLoaded(true); setLoading(false); setLoadError(''); onEntriesChange?.(next); dismiss();
    } finally { setBusy(false); }
  }
  async function remove(entry: VocabularyEntry) {
    if (!window.confirm(`Delete “${entry.lemma}” (${entry.meaningZh})?\nIts note and collected contexts will be removed. Saved stories and original media will remain. This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await window.inflow!.deleteVocabulary(entry.id); requestVersion.current++;
      const next = entries.filter(item => item.id !== entry.id);
      setEntries(next); setSelectedId(next[0]?.id ?? null); onEntriesChange?.(next); setNoteDraft(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Deletion failed. Please try again.'); }
    finally { setBusy(false); }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'media', label: 'Media' },
    { id: 'stories', label: 'Stories' }, { id: 'manual', label: 'No source' },
  ];

  return <section className="vocab-workspace" id="notebook" aria-label="Vocabulary notebook">
    <section className="vocab-panel vocab-list-panel" aria-label="Vocabulary list">
      <header className="vocab-list-heading">
        <div className="vocab-title"><h1>Vocabulary</h1><span>{entries.length} words</span></div>
        <div className="vocab-heading-actions">
          <button className="vocab-add-word" type="button" disabled={hasPendingEdit || loading} onClick={addEntry}>Add manually</button>
          <button className="vocab-generate" type="button" disabled={hasPendingEdit || loading || !entries.length} onClick={() => onGenerateStory(entries)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 14 .9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14Z"/></svg>
            Generate story
          </button>
        </div>
      </header>
      <div className="vocab-toolbar">
        <label className="vocab-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <span className="vocab-sr-only">Search vocabulary</span>
          <input value={query} onChange={event => { if (beforeChange()) setQuery(event.target.value); }} placeholder="Search vocabulary…" type="search"/>
        </label>
        <div className="vocab-filters" role="group" aria-label="Filter vocabulary">
          {filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => { if (beforeChange()) setFilter(item.id); }}>
            {item.label}<span>{counts[item.id]}</span>
          </button>)}
        </div>
        <details className="vocab-language-filter" data-active={languageFilter !== 'all'} onKeyDown={event => {
          if (event.key === 'Escape' && event.currentTarget.open) {
            event.preventDefault(); event.stopPropagation(); event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus();
          }
        }}>
          <summary aria-label="Filter vocabulary by language" title={languageFilter === 'all' ? 'Filter vocabulary by language' : `Language: ${languageFilter === 'en' ? 'English' : 'Korean'}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8Z"/></svg>
          </summary>
          <div className="vocab-language-filter-menu">
            <strong>Language</strong>
            <div className="vocab-language-filters" role="group" aria-label="Filter vocabulary by source language">
              {[{ id: 'all', label: 'All' }, { id: 'ko', label: 'Korean' }, { id: 'en', label: 'English' }].map(item => <button type="button" key={item.id} aria-pressed={languageFilter === item.id} onClick={event => {
                if (!beforeChange()) return;
                setLanguageFilter(item.id as LanguageFilter);
                const menu = event.currentTarget.closest('details');
                menu?.removeAttribute('open'); menu?.querySelector('summary')?.focus();
              }}>{item.label}<span>{languageCounts[item.id as LanguageFilter]}</span></button>)}
            </div>
          </div>
        </details>
      </div>
      {error && <p className="vocab-error" role="alert">{error}</p>}
      {loadError && <p className="vocab-error" role="alert">{loadError}<button type="button" disabled={hasPendingEdit || loading} onClick={() => { setLoading(true); setReloadKey(value => value + 1); }}>Retry loading vocabulary</button></p>}
      <div className="vocab-rows" aria-live="polite">
        {visibleEntries.map(entry => {
          const context = entry.contexts[0];
          const source = context?.source;
          return <button className="vocab-row" type="button" key={entry.id} aria-pressed={selectedEntry?.id === entry.id} onClick={() => { if (beforeChange()) setSelectedId(entry.id); }}>
            <span className="vocab-row-word"><span lang={entry.language}>{entry.lemma}</span><small className="vocab-language-badge">{entry.language === 'en' ? 'English' : 'Korean'}</small></span>
            <span className="vocab-row-example">
              <span className="vocab-row-meaning" lang="zh">{entry.meaningZh}</span>
              <span className="vocab-row-sentence" lang={entry.language}>{context ? <HighlightedSentence {...context}/> : 'No source'}</span>
            </span>
            <span className="vocab-row-source">
              {source ? <><span className="vocab-row-thumb"><SourceThumbnail key={thumbnailKey(source)} source={source}/></span><span className="vocab-row-source-copy"><span>{source.name}</span><small>{source.type === 'artifact' ? 'Story · ' + location(source) : location(source)}</small></span></> : <><span className="vocab-manual-mark">—</span><span className="vocab-row-source-copy"><span>No source</span></span></>}
            </span>
          </button>;
        })}
        {!visibleEntries.length && <p className="vocab-empty">{!loaded ? 'Loading vocabulary…' : loadError ? 'Vocabulary could not be loaded. Please retry.' : entries.length ? 'No vocabulary matches this view.' : 'Collect a word in Content or add one manually to get started.'}</p>}
      </div>
    </section>
    <section className="vocab-panel vocab-detail-panel" aria-label="Vocabulary details">
      {draft ? <VocabularyEditor key={draft.key} draft={draft} busy={busy} active={active} onSave={save} onCancel={dismiss}/> : selectedEntry ? <>
        <header className="vocab-detail-heading">
          <div className="vocab-detail-title">
            <h2 lang={selectedEntry.language}>{selectedEntry.lemma}</h2>
            <span className="vocab-language-badge">{selectedEntry.language === 'en' ? 'English' : 'Korean'}</span>
            <Pronunciation key={selectedEntry.id} entry={selectedEntry} active={active && !hasPendingEdit}/>
          </div>
          <div className="vocab-detail-actions"><button className="vocab-edit" type="button" disabled={hasPendingEdit} onClick={() => editEntry(selectedEntry)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z"/><path d="M12 20h8"/></svg>Edit
          </button>
          <button className="vocab-delete" type="button" disabled={hasPendingEdit} onClick={() => void remove(selectedEntry)}>Delete</button></div>
        </header>
        <section className="vocab-detail-section">
          <h3>Meaning</h3>
          <div className="vocab-meaning-card" lang="zh">{selectedEntry.meaningZh}</div>
        </section>
        <section className="vocab-detail-section vocab-contexts-section">
          <header className="vocab-section-heading"><div><h3>Contexts</h3><span>{selectedEntry.contexts.length}</span></div></header>
          {selectedEntry.contexts.length ? <div className="vocab-context-list">
            {selectedEntry.contexts.map(context => <article className="vocab-context-card" key={context.id}>
              <div className="vocab-context-thumbnail"><SourceThumbnail key={thumbnailKey(context.source)} source={context.source}/></div>
              <div className="vocab-context-copy">
                <p lang={selectedEntry.language}><HighlightedSentence {...context}/></p>
                <span className="vocab-context-source"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={context.source.type === 'artifact' ? 'M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5' : 'M3 6h13v12H3zM16 10l5-3v10l-5-3z'}/></svg>{context.source.name} · {context.source.type === 'artifact' ? 'Story · ' + location(context.source) : location(context.source)}</span>
              </div>
              <button className="vocab-open-source" type="button" aria-label={`Open ${context.source.name} at ${location(context.source)}`} onClick={() => { if (beforeChange()) onOpenSource(context.source); }}>Open <span aria-hidden="true">↗</span></button>
            </article>)}
          </div> : <p className="vocab-no-context">No source</p>}
        </section>
        <details className="vocab-detail-section vocab-notes-section" key={selectedEntry.id}>
          <summary>Notes <small>{selectedEntry.note ? 'Saved' : 'Optional'}</small></summary>
          <fieldset disabled={busy}>
            <textarea rows={2} maxLength={2000} value={noteDraft?.id === selectedEntry.id ? noteDraft.note : selectedEntry.note ?? ''} onChange={event => setNoteDraft({ id: selectedEntry.id, note: event.target.value })} placeholder="Add a personal note…" aria-label="Personal note"/>
            <div className="vocab-editor-actions"><button type="button" disabled={!noteDirty} onClick={() => void save({ id: selectedEntry.id, language: selectedEntry.language, lemma: selectedEntry.lemma, meaningZh: selectedEntry.meaningZh, note: noteDraft!.note }).catch(failure => setError(failure instanceof Error ? failure.message : 'Note save failed. Please retry.'))}>{busy ? 'Saving…' : 'Save note'}</button><button type="button" onClick={() => { setNoteDraft(null); setError(''); }}>Cancel</button></div>
          </fieldset>
        </details>
      </> : <p className="vocab-detail-empty">{loaded ? 'Select a word to see its details.' : 'Loading vocabulary…'}</p>}
    </section>
  </section>;
}
