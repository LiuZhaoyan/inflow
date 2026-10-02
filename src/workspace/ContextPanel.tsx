"use client";

import { useEffect, useRef } from 'react';
import type { Segment } from '@/listening/processing';

const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function ContextPanel({
  segments,
  index,
  onSelect,
  showText,
  onToggleText,
}: {
  segments: readonly Segment[];
  index: number;
  onSelect: (index: number) => void;
  showText: boolean;
  onToggleText: () => void;
}) {
  const activeRow = useRef<HTMLButtonElement>(null);

  useEffect(() => { activeRow.current?.scrollIntoView({ block: 'nearest' }); }, [index, segments.length]);

  return <aside className="workspace-context-panel" aria-label="Sentence context">
    <div className="workspace-context-heading">
      <h2>Context</h2>
      <span>{segments.length} {segments.length === 1 ? 'sentence' : 'sentences'}</span>
    </div>
    <button type="button" className="workspace-context-toggle" aria-pressed={showText} onClick={onToggleText}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
      {showText ? 'Hide text' : 'Show full text'}
    </button>
    <div className="workspace-context-rows" aria-label="Sentence list">
      {segments.length ? segments.map((segment, itemIndex) => <button type="button" key={`${segment.start}-${itemIndex}`}
        ref={itemIndex === index ? activeRow : undefined} className="workspace-context-row"
        aria-current={itemIndex === index ? 'true' : undefined} aria-label={showText ? `${formatTime(segment.start)} ${segment.text}` : `Sentence at ${formatTime(segment.start)}`}
        onClick={() => onSelect(itemIndex)}>
        <time>{formatTime(segment.start)}</time><span lang={showText ? 'ko' : undefined}>{showText ? segment.text : '••••••'}</span>
      </button>) : <p className="workspace-context-empty">Your sentences will appear here after processing a media file.</p>}
    </div>
  </aside>;
}
