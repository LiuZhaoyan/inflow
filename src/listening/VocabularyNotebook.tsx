"use client";

import { useEffect, useState } from 'react';
import type { SaveVocabularyInput, VocabularyContext, VocabularyEntry } from './desktop';
import SourceThumbnail from '@/workspace/SourceThumbnail';
import '@/workspace/vocab.css';

type VocabularyDraft = {
  key: string; id?: string; language?: SaveVocabularyInput['language']; lemma: string; meaningZh: string;
};

function VocabularyEditor({ draft, busy, active, onSave, onCancel }: {
  draft: VocabularyDraft; busy: boolean; active: boolean; onSave: (input: SaveVocabularyInput) => Promise<void>; onCancel: () => void;
}) {
  const [lemma, setLemma] = useState(draft.lemma);
  const [meaning, setMeaning] = useState(draft.meaningZh);
  const [error, setError] = useState('');
  return <form className="vocab-editor" aria-label="Edit vocabulary" onSubmit={event => {
    event.preventDefault(); setError('');
    void onSave({ id: draft.id, language: draft.language, lemma, meaningZh: meaning })
      .catch(failure => setError(failure instanceof Error ? failure.message : 'Save failed. Please try again.'));
  }}>
    <h2>{draft.id ? 'Edit vocabulary' : 'Add vocabulary'}</h2>
    <fieldset disabled={busy}>
      <label>Korean lemma<input autoFocus={active} name="lemma" value={lemma} maxLength={100} required onChange={event => setLemma(event.target.value)}/></label>
      <label>Chinese meaning<input name="meaningZh" value={meaning} maxLength={300} required onChange={event => setMeaning(event.target.value)}/></label>
      <p className="vocab-editor-note">Confirm the dictionary form and its meaning in this context.</p>
      <div className="vocab-editor-actions"><button className="vocab-primary" type="submit">{busy ? 'Saving…' : 'Save vocabulary'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
    {error && <p className="vocab-error" role="alert">{error}</p>}
  </form>;
}

type Filter = 'all' | 'media' | 'stories' | 'manual';

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

function HighlightedSentence({ sentence, surface }: { sentence: string; surface: string }) {
  const index = surface ? sentence.indexOf(surface) : -1;
  if (index < 0) return <>{sentence}</>;
  return <>{sentence.slice(0, index)}<mark>{surface}</mark>{sentence.slice(index + surface.length)}</>;
}

function thumbnailKey(source: VocabularyContext['source']) {
  return source.type === 'media' ? source.mediaId + ':' + source.segmentId : source.artifactId + ':' + source.sentenceIndex;
}

export default function VocabularyNotebook({
  refreshKey, onOpenSource, onGenerateStory, onEntriesChange,
  onEditingChange, active = true,
}: {
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
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const draft = editing;
  const hasPendingEdit = Boolean(draft) || busy;

  useEffect(() => {
    let current = true;
    window.inflow!.listVocabulary().then(result => {
      if (!current) return;
      setEntries(result); setSelectedId(result[0]?.id ?? null); setLoaded(true); onEntriesChange?.(result);
    }).catch(failure => {
      if (current) setError(failure instanceof Error ? failure.message : 'Could not load vocabulary.');
    });
    return () => { current = false; };
  }, [onEntriesChange, refreshKey]);

  useEffect(() => { onEditingChange?.(hasPendingEdit); }, [hasPendingEdit, onEditingChange]);
  useEffect(() => {
    if (active && draft) document.querySelector<HTMLInputElement>('#notebook input[name="lemma"]')?.focus();
  }, [active, draft]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEntries = entries.filter(entry => matchesFilter(entry, filter) && (
    !normalizedQuery || [entry.lemma, entry.meaningZh, ...entry.contexts.flatMap(context => [
      context.surface, context.sentence, context.source.name,
    ])].some(value => value.toLocaleLowerCase().includes(normalizedQuery))
  ));
  const selectedEntry = visibleEntries.find(entry => entry.id === selectedId) ?? visibleEntries[0] ?? null;
  const counts = {
    all: entries.length,
    media: entries.filter(isMedia).length,
    stories: entries.filter(isStory).length,
    manual: entries.filter(entry => entry.contexts.length === 0).length,
  };

  function dismiss() { setEditing(null); }
  function editEntry(entry: VocabularyEntry) {
    setEditing({ key: crypto.randomUUID(), id: entry.id, language: entry.language, lemma: entry.lemma, meaningZh: entry.meaningZh });
  }
  function addEntry() {
    setEditing({ key: crypto.randomUUID(), lemma: '', meaningZh: '' });
  }
  async function save(input: SaveVocabularyInput) {
    setBusy(true); setError('');
    try {
      const saved = await window.inflow!.saveVocabulary(input);
      const next = await window.inflow!.listVocabulary();
      setEntries(next); setSelectedId(saved.id); onEntriesChange?.(next); dismiss();
    } finally { setBusy(false); }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'media', label: 'Media' },
    { id: 'stories', label: 'Stories' }, { id: 'manual', label: 'Manual' },
  ];

  return <section className="vocab-workspace" id="notebook" aria-label="Vocabulary notebook">
    <section className="vocab-panel vocab-list-panel" aria-label="Vocabulary list">
      <header className="vocab-list-heading">
        <div className="vocab-title"><h1>Vocabulary</h1><span>{entries.length} words</span></div>
        <div className="vocab-heading-actions">
          <button className="vocab-add-word" type="button" disabled={hasPendingEdit} onClick={addEntry}>Add manually</button>
          <button className="vocab-generate" type="button" disabled={hasPendingEdit || !entries.length} onClick={() => onGenerateStory(entries)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 14 .9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14Z"/></svg>
            Generate story
          </button>
        </div>
      </header>
      <div className="vocab-toolbar">
        <label className="vocab-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <span className="vocab-sr-only">Search vocabulary</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search vocabulary…" type="search"/>
        </label>
        <div className="vocab-filters" role="group" aria-label="Filter vocabulary">
          {filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}<span>{counts[item.id]}</span>
          </button>)}
        </div>
      </div>
      {error && <p className="vocab-error" role="alert">{error}</p>}
      <div className="vocab-rows" aria-live="polite">
        {visibleEntries.map(entry => {
          const context = entry.contexts[0];
          const source = context?.source;
          return <button className="vocab-row" type="button" key={entry.id} aria-pressed={selectedEntry?.id === entry.id} onClick={() => setSelectedId(entry.id)}>
            <span className="vocab-row-word" lang="ko">{entry.lemma}</span>
            <span className="vocab-row-example">
              <span className="vocab-row-meaning">{entry.meaningZh}</span>
              <span className="vocab-row-sentence" lang="ko">{context ? <HighlightedSentence sentence={context.sentence} surface={context.surface}/> : 'Manual entry'}</span>
            </span>
            <span className="vocab-row-source">
              {source ? <><span className="vocab-row-thumb"><SourceThumbnail key={thumbnailKey(source)} source={source}/></span><span className="vocab-row-source-copy"><span>{source.name}</span><small>{source.type === 'artifact' ? 'Story · ' + location(source) : location(source)}</small></span></> : <><span className="vocab-manual-mark">M</span><span className="vocab-row-source-copy"><span>Manual</span></span></>}
            </span>
          </button>;
        })}
        {!visibleEntries.length && <p className="vocab-empty">{loaded ? 'No vocabulary matches this view.' : 'Loading vocabulary…'}</p>}
      </div>
    </section>
    <section className="vocab-panel vocab-detail-panel" aria-label="Vocabulary details">
      {draft ? <VocabularyEditor key={draft.key} draft={draft} busy={busy} active={active} onSave={save} onCancel={dismiss}/> : selectedEntry ? <>
        <header className="vocab-detail-heading">
          <div className="vocab-detail-title">
            <h2 lang="ko">{selectedEntry.lemma}</h2>
            <button className="vocab-pronunciation" type="button" disabled title="Pronunciation is not available yet" aria-label="Pronunciation unavailable">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a5 5 0 0 1 0 6M17.5 6.5a9 9 0 0 1 0 11"/></svg>
            </button>
          </div>
          <button className="vocab-edit" type="button" disabled={hasPendingEdit} onClick={() => editEntry(selectedEntry)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z"/><path d="M12 20h8"/></svg>Edit
          </button>
        </header>
        <section className="vocab-detail-section">
          <h3>Meaning</h3>
          <div className="vocab-meaning-card">{selectedEntry.meaningZh}</div>
        </section>
        <section className="vocab-detail-section vocab-contexts-section">
          <header className="vocab-section-heading"><div><h3>Contexts</h3><span>{selectedEntry.contexts.length}</span></div>
            <button type="button" disabled title="Adding contexts is not available yet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Add context</button>
          </header>
          {selectedEntry.contexts.length ? <div className="vocab-context-list">
            {selectedEntry.contexts.map(context => <article className="vocab-context-card" key={context.id}>
              <div className="vocab-context-thumbnail"><SourceThumbnail key={thumbnailKey(context.source)} source={context.source}/></div>
              <div className="vocab-context-copy">
                <p lang="ko"><HighlightedSentence sentence={context.sentence} surface={context.surface}/></p>
                <span className="vocab-context-source"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={context.source.type === 'artifact' ? 'M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5' : 'M3 6h13v12H3zM16 10l5-3v10l-5-3z'}/></svg>{context.source.name} · {context.source.type === 'artifact' ? 'Story · ' + location(context.source) : location(context.source)}</span>
              </div>
              <button className="vocab-open-source" type="button" onClick={() => onOpenSource(context.source)}>Open <span aria-hidden="true">↗</span></button>
            </article>)}
          </div> : <p className="vocab-no-context">No saved contexts for this word.</p>}
        </section>
        <section className="vocab-detail-section vocab-source-section">
          <h3>Source</h3>
          {selectedEntry.contexts[0] ? <div className="vocab-source-card">
            <span className="vocab-source-art"><SourceThumbnail key={thumbnailKey(selectedEntry.contexts[0].source)} source={selectedEntry.contexts[0].source}/></span>
            <span className="vocab-source-copy"><strong>{selectedEntry.contexts[0].source.name}</strong><small>{selectedEntry.contexts[0].source.type === 'artifact' ? 'Story · ' + location(selectedEntry.contexts[0].source) : 'Media · ' + location(selectedEntry.contexts[0].source)}</small></span>
            <button type="button" onClick={() => onOpenSource(selectedEntry.contexts[0].source)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5h6v6M19 5l-9 9"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>Open source
            </button>
          </div> : <p className="vocab-no-context">Manual entry · no saved source</p>}
        </section>
        <section className="vocab-detail-section vocab-notes-section">
          <h3>Notes</h3>
          <textarea disabled title="Personal notes are not available yet" placeholder="Add a personal note…" aria-label="Personal notes unavailable"/>
        </section>
      </> : <p className="vocab-detail-empty">{loaded ? 'Select a word to see its details.' : 'Loading vocabulary…'}</p>}
    </section>
  </section>;
}
