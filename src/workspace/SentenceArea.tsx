"use client";

import type { Ref } from 'react';
import RevealMenu from '@/listening/RevealMenu';
import { revealedGroupCount, type RevealChoice } from '@/listening/reveal';
import type { Segment } from '@/listening/processing';
import type { PlaybackMode } from '@/listening/desktop';
import CloudCredential from '@/listening/CloudCredential';

export type SentenceAreaProps = {
  segment: Segment | null;
  index: number;
  total: number;
  mode: PlaybackMode;
  onModeChange: (mode: PlaybackMode) => void;
  canPlay: boolean;
  playing: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  reveal: RevealChoice | null;
  onReveal: (choice: RevealChoice) => void;
  onHideText: () => void;
  transcriptRef: Ref<HTMLParagraphElement>;
  rate: number;
  onRateChange: (rate: number) => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  translationOpen: boolean;
  translation: string;
  translationBusy: boolean;
  translationError: string;
  onToggleTranslation: () => void;
  onTranslate: (options: { refresh?: boolean; local?: boolean }) => void;
  onCancelTranslation: () => void;
};

export default function SentenceArea({
  segment,
  index,
  total,
  mode,
  onModeChange,
  canPlay,
  playing,
  onPlayPause,
  onPrevious,
  onNext,
  reveal,
  onReveal,
  onHideText,
  transcriptRef,
  rate,
  onRateChange,
  loop,
  onLoopChange,
  translationOpen,
  translation,
  translationBusy,
  translationError,
  onToggleTranslation,
  onTranslate,
  onCancelTranslation,
}: SentenceAreaProps) {
  const revealCount = segment && reveal ? revealedGroupCount(segment.groups, reveal) : 0;
  const currentNumber = String(index + 1).padStart(2, '0');
  const totalNumber = String(total).padStart(2, '0');
  const groupStarts: number[] = [];
  let groupStart = 0;
  for (const group of segment?.groups ?? []) {
    const start = segment!.text.indexOf(group, groupStart);
    groupStarts.push(start); groupStart = start + group.length;
  }

  return <section className="workspace-sentence-area" aria-label="Sentence practice">
    <div className="workspace-sentence-meta">
      <span>{segment ? formatTime(segment.start) + ' – ' + formatTime(segment.end) : 'No sentence selected'}</span>
      {segment && <span className="workspace-sentence-count">{currentNumber} / {totalNumber}</span>}
      <div className="workspace-reveal-control"><RevealMenu disabled={!segment} onSelect={onReveal}/></div>
      {reveal && <button type="button" className="workspace-text-hide" onClick={onHideText}>Hide text</button>}
    </div>
    <div className="workspace-sentence-copy">
    {segment ? <p className="workspace-sentence-text" ref={transcriptRef} lang="ko" aria-live="polite"><span className="workspace-sentence-text-groups">{segment.groups.map((group, groupIndex) => <span key={groupIndex} data-source-start={groupStarts[groupIndex]}
      className={groupIndex < revealCount ? 'meaning-group' : 'hidden-group'}>{groupIndex < revealCount ? group : <span aria-label="Unrevealed meaning group">•••</span>}{' '}</span>)}</span></p>
      : <p className="workspace-sentence-empty">Process a media file to see its sentences.</p>}
    {translationOpen && <section className="workspace-translation" aria-label="Current sentence translation" aria-live="polite">
      {translation && <p lang="zh">{translation}</p>}
      {translationBusy && <p role="status">Preparing translation… <button type="button" onClick={onCancelTranslation}>Cancel</button></p>}
      {translationError && <p role="alert">{translationError}</p>}
      {!translationBusy && <div className="workspace-translation-actions">
        <button type="button" onClick={() => onTranslate({ refresh: true })}>{translation ? 'Translate again' : 'Retry translation'}</button>
        {translationError && <button type="button" onClick={() => onTranslate({ local: true })}>Use local reference translation</button>}
      </div>}
      {typeof window !== 'undefined' && window.inflow && <CloudCredential/>}
    </section>}
    </div>
    <div className="workspace-player-toolbar">
      <div className="workspace-sentence-transport" role="group" aria-label="Sentence playback controls">
        <button type="button" aria-label="Previous sentence" title="Previous sentence" disabled={!segment || index <= 0} onClick={onPrevious}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 6l-10 6 10 6z"/></svg>
        </button>
        <button type="button" className="workspace-play-button" aria-label={playing ? 'Pause' : 'Play'} disabled={!canPlay} onClick={onPlayPause}>
          {playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>}
        </button>
        <button type="button" aria-label="Next sentence" title="Next sentence" disabled={!segment || index >= total - 1} onClick={onNext}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 6l10 6-10 6z"/></svg>
        </button>
      </div>
      <div className="workspace-sentence-options">
        <fieldset className="workspace-mode-switch"><legend>Playback mode</legend>
          <button type="button" aria-pressed={mode === 'full'} onClick={() => onModeChange('full')}>Full</button>
          <button type="button" aria-pressed={mode === 'sentence'} disabled={!segment} onClick={() => onModeChange('sentence')}>Sentence</button>
        </fieldset>
        <div className="workspace-sentence-tools">
          <label><span className="workspace-sr-only">Speed</span><select aria-label="Playback speed" value={rate} onChange={event => onRateChange(Number(event.target.value))}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
          </select></label>
          <button type="button" aria-label={loop ? 'Turn sentence loop off' : 'Loop sentence'} title={loop ? 'Turn sentence loop off' : 'Loop sentence'} aria-pressed={loop} disabled={!segment || mode === 'full'} onClick={() => onLoopChange(!loop)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/></svg><span>Loop</span>
          </button>
          <button type="button" aria-label={translationOpen ? 'Hide Chinese translation' : 'Show Chinese translation'} title={translationOpen ? 'Hide Chinese translation' : 'Show Chinese translation'} aria-expanded={translationOpen} disabled={!segment} onClick={onToggleTranslation}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h10M9 3v2m4 0c-1 5-4 8-8 10m2-6c1 3 4 5 7 6m1 4 3-8 3 8m-5-2h4"/></svg><span>中文</span>
          </button>
        </div>
      </div>
    </div>
  </section>;
}

const formatTime = (value: number) => String(Math.floor(value / 60)) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
