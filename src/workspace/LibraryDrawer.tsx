"use client";

import { useEffect, useRef, useState } from 'react';
import type { LearningArtifact, SavedMedia, SourceLanguage } from '@/listening/desktop';

const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function LibraryDrawer({
  open,
  items,
  currentId,
  artifacts = [],
  currentArtifactId,
  onOpenArtifact,
  onClose,
  onImport,
  onOpen,
  onRelink,
}: {
  open: boolean;
  items: SavedMedia[];
  currentId?: string | null;
  artifacts?: LearningArtifact[];
  currentArtifactId?: string | null;
  onOpenArtifact?: (artifact: LearningArtifact) => void;
  onClose: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
  onRelink: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | SourceLanguage>('all');

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    let focusFrame = 0;
    if (open && !element.open) {
      element.showModal();
      focusFrame = requestAnimationFrame(() => filterInput.current?.focus());
    } else if (!open && element.open) element.close();
    return () => cancelAnimationFrame(focusFrame);
  }, [open]);

  const query = filter.trim().toLocaleLowerCase();
  const visibleItems = items.filter(item => (languageFilter === 'all' || item.language === languageFilter) && item.name.toLocaleLowerCase().includes(query));
  const visibleArtifacts = artifacts.filter(item => (languageFilter === 'all' || item.language === languageFilter) && item.title.toLocaleLowerCase().includes(query));
  const languageCounts = {
    all: items.length + artifacts.length,
    ko: items.filter(item => item.language === 'ko').length + artifacts.filter(item => item.language === 'ko').length,
    en: items.filter(item => item.language === 'en').length + artifacts.filter(item => item.language === 'en').length,
  };
  const languageName = (language: SourceLanguage) => language === 'en' ? 'English' : 'Korean';

  return <dialog ref={dialog} className="workspace-library-dialog" aria-labelledby="workspace-library-title"
    onClose={event => { event.currentTarget.querySelector('details')?.removeAttribute('open'); onClose(); }}
    onCancel={event => {
      const menu = event.currentTarget.querySelector('details[open]');
      if (menu) { event.preventDefault(); menu.removeAttribute('open'); menu.querySelector('summary')?.focus(); }
    }} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="workspace-library-head">
      <h2 id="workspace-library-title">Library</h2>
      <button type="button" className="workspace-icon-button" aria-label="Close library" onClick={() => dialog.current?.close()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div className="workspace-library-toolbar">
      <label className="workspace-library-search"><span className="workspace-sr-only">Search library by name</span><input ref={filterInput} type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search library"/></label>
      <details className="workspace-library-filter" data-active={languageFilter !== 'all'}>
        <summary className="workspace-icon-button" aria-label="Filter library by language" title={languageFilter === 'all' ? 'Filter library by language' : `Language: ${languageName(languageFilter)}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8Z"/></svg>
        </summary>
        <div className="workspace-library-filter-menu">
          <strong>Language</strong>
          <div className="workspace-library-filters" role="group" aria-label="Filter library by source language">
            {[{ id: 'all', label: 'All' }, { id: 'ko', label: 'Korean' }, { id: 'en', label: 'English' }].map(item => <button type="button" key={item.id} aria-pressed={languageFilter === item.id} onClick={event => {
              setLanguageFilter(item.id as 'all' | SourceLanguage);
              const menu = event.currentTarget.closest('details');
              menu?.removeAttribute('open'); menu?.querySelector('summary')?.focus();
            }}>{item.label}<span>{languageCounts[item.id as 'all' | SourceLanguage]}</span></button>)}
          </div>
        </div>
      </details>
    </div>
    <div className="workspace-library-count">{languageFilter === 'all' ? 'All languages' : languageName(languageFilter)}</div>
    <ul className="workspace-library-list">
      {visibleItems.map(item => <li key={item.id} className="workspace-library-entry">
        <button type="button" className="workspace-library-item" aria-current={item.id === currentId ? 'true' : undefined} onClick={() => onOpen(item.id)}>
          <span className="workspace-library-kind" aria-hidden="true">{item.video ? 'VIDEO' : 'AUDIO'}</span>
          <span className="workspace-library-info"><span className="workspace-library-title-row"><strong title={item.name}>{item.name}</strong><span className="workspace-language-badge">{languageName(item.language)}</span></span><span>{item.learning.duration > 600 ? 'Playback disabled · over 10 min' : formatTime(item.learning.duration) + ' · ' + item.segments.length + ' sentences'}</span></span>
          <svg className="workspace-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        {item.missing && <div className="workspace-library-missing"><span>Media file missing</span><button type="button" onClick={() => onRelink(item.id)}>Relink</button></div>}
      </li>)}
      {visibleArtifacts.map(artifact => <li key={artifact.id} className="workspace-library-entry">
        <button type="button" className="workspace-library-item" aria-current={artifact.id === currentArtifactId ? 'true' : undefined} onClick={() => onOpenArtifact?.(artifact)}>
          <span className="workspace-library-kind" aria-hidden="true">STORY</span><span className="workspace-library-info"><span className="workspace-library-title-row"><strong title={artifact.title}>{artifact.title}</strong><span className="workspace-language-badge">{languageName(artifact.language)}</span></span><span>{artifact.targets.length} words · {artifact.sentences.length} sentences</span></span>
          <svg className="workspace-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </li>)}
    </ul>
    {!visibleItems.length && !visibleArtifacts.length && <p className="workspace-library-empty">{items.length || artifacts.length ? 'No content matches that name.' : 'No saved content yet. Import an audio or video file to begin.'}</p>}
    <div className="workspace-library-footer"><button type="button" className="workspace-primary-button" onClick={onImport}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>Import media
    </button></div>
  </dialog>;
}
