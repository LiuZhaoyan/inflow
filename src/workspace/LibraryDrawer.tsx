"use client";

import { useEffect, useRef, useState } from 'react';
import type { SavedMedia } from '@/listening/desktop';

const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function LibraryDrawer({
  open,
  items,
  currentId,
  onClose,
  onImport,
  onOpen,
  onRelink,
}: {
  open: boolean;
  items: SavedMedia[];
  currentId?: string | null;
  onClose: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
  onRelink: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');

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
  const visibleItems = items.filter(item => item.name.toLocaleLowerCase().includes(query));

  return <dialog ref={dialog} className="workspace-library-dialog" aria-labelledby="workspace-library-title"
    onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="workspace-library-head">
      <h2 id="workspace-library-title">Library</h2>
      <button type="button" className="workspace-icon-button" aria-label="Close library" onClick={() => dialog.current?.close()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <label className="workspace-library-search"><span className="workspace-sr-only">Search library by name</span><input ref={filterInput} type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search library"/></label>
    <div className="workspace-library-count">{items.length} saved {items.length === 1 ? 'item' : 'items'}</div>
    <ul className="workspace-library-list">
      {visibleItems.map(item => <li key={item.id} className="workspace-library-entry">
        <button type="button" className="workspace-library-item" aria-current={item.id === currentId ? 'true' : undefined} onClick={() => onOpen(item.id)}>
          <span className="workspace-library-kind" aria-hidden="true">{item.video ? 'VIDEO' : 'AUDIO'}</span>
          <span className="workspace-library-info"><strong title={item.name}>{item.name}</strong><span>{item.learning.duration > 600 ? 'Playback disabled · over 10 min' : formatTime(item.learning.duration) + ' · ' + item.segments.length + ' sentences'}</span></span>
          <svg className="workspace-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        {item.missing && <div className="workspace-library-missing"><span>Media file missing</span><button type="button" onClick={() => onRelink(item.id)}>Relink</button></div>}
      </li>)}
    </ul>
    {!visibleItems.length && <p className="workspace-library-empty">{items.length ? 'No media matches that name.' : 'No saved media yet. Import an audio or video file to begin.'}</p>}
    <div className="workspace-library-footer"><button type="button" className="workspace-primary-button" onClick={onImport}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>Import media
    </button></div>
  </dialog>;
}
