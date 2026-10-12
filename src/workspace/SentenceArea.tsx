"use client";

import Notice from '@/workspace/Notice';

import Dropdown from "@/workspace/Dropdown";
import { useLocale } from '@/i18n/context';
import type { Ref } from 'react';
import type { Segment } from '@/listening/processing';
import type { PlaybackMode, SourceLanguage } from '@/listening/desktop';

export type SentenceAreaProps = {
  segment: Segment | null;
  index: number;
  total: number;
  language: SourceLanguage;
  mode: PlaybackMode;
  onModeChange: (mode: PlaybackMode) => void;
  canPlay: boolean;
  playing: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  maskedGroups: readonly number[];
  maskEditing: boolean;
  onToggleMaskEditing: () => void;
  onToggleGroup: (index: number) => void;
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
  language,
  mode,
  onModeChange,
  canPlay,
  playing,
  onPlayPause,
  onPrevious,
  onNext,
  maskedGroups,
  maskEditing,
  onToggleMaskEditing,
  onToggleGroup,
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
  const { locale, t, error: localize } = useLocale();
  const currentNumber = String(index + 1).padStart(2, '0');
  const totalNumber = String(total).padStart(2, '0');
  const groupStarts: number[] = [];
  let groupStart = 0;
  for (const group of segment?.groups ?? []) {
    const start = segment!.text.indexOf(group, groupStart);
    groupStarts.push(start); groupStart = start + group.length;
  }

  return <section className={`workspace-sentence-area${maskEditing ? ' is-masking' : ''}`} aria-label={t("Sentence practice")}>
    <div className="workspace-sentence-meta">
      <div className="workspace-sentence-heading"><h2>{t("Current sentence")}</h2><span>{segment ? formatTime(segment.start) + ' – ' + formatTime(segment.end) : t("No sentence selected")}</span></div>
      {segment && <span className="workspace-sentence-count">{currentNumber} / {totalNumber}</span>}
      {segment && maskEditing && <span className="workspace-mask-summary" id="sentence-mask-summary" role="status">{t('{count} / {total} masked', { count: maskedGroups.length, total: segment.groups.length })}</span>}
      <button type="button" className="workspace-mask-toggle" disabled={!segment} aria-pressed={maskEditing} aria-describedby={maskEditing ? 'sentence-mask-summary' : undefined} onClick={onToggleMaskEditing}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M7 12h10"/></svg>
        <span>{maskEditing ? t("Done editing") : t("Set masks")}</span>
      </button>
    </div>
    <div className="workspace-sentence-copy" key={segment ? `${segment.start}-${segment.text}` : 'empty'}>
    {segment ? <p className="workspace-sentence-text" ref={transcriptRef} lang={language} aria-live="polite"><span className="workspace-sentence-text-groups">{segment.groups.map((group, groupIndex) => {
      const masked = maskedGroups.includes(groupIndex);
      const hidden = maskEditing && masked;
      return <span key={groupIndex} data-source-start={groupStarts[groupIndex]} className={hidden ? 'hidden-group' : 'meaning-group'}>
        {maskEditing ? <button type="button" className={`workspace-mask-group${masked ? ' is-masked' : ''}`} lang={locale} aria-pressed={masked} aria-label={masked ? t('Show meaning group {number}', { number: groupIndex + 1 }) : t('Hide meaning group {number}: {text}', { number: groupIndex + 1, text: group })} onClick={() => onToggleGroup(groupIndex)}><span className="workspace-mask-text" lang={language} aria-hidden={hidden || undefined}>{group}</span></button>
          : <span className="workspace-group-text">{group}</span>}{' '}
      </span>;
    })}</span></p>
      : <p className="workspace-sentence-empty">{t("Process a media file to see its sentences.")}</p>}
    {translationOpen && <section className="workspace-translation" aria-label={t("Current sentence translation")} aria-live="polite">
      {translation && <p lang="zh">{translation}</p>}
      {translationBusy && <p role="status">{t("Preparing translation…")} <button type="button" onClick={onCancelTranslation}>{t("Cancel")}</button></p>}
      {translationError && <Notice message={localize(translationError, 'The operation failed. Please retry.')}/>}
      {!translationBusy && <div className="workspace-translation-actions">
        <button type="button" onClick={() => onTranslate({ refresh: true })}>{translation ? t("Translate again") : t("Retry translation")}</button>
        {translationError && <button type="button" onClick={() => onTranslate({ local: true })}>{t("Use local reference translation")}</button>}
      </div>}
    </section>}
    </div>
    <div className="workspace-player-toolbar">
      <div className="workspace-sentence-transport" role="group" aria-label={t("Sentence playback controls")}>
        <button type="button" aria-label={t("Previous sentence")} title={t("Previous sentence")} disabled={!segment || index <= 0} onClick={onPrevious}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 6l-10 6 10 6z"/></svg>
        </button>
        <button type="button" className="workspace-play-button" aria-label={playing ? t("Pause") : t("Play")} disabled={!canPlay} onClick={onPlayPause}>
          {playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>}
        </button>
        <button type="button" aria-label={t("Next sentence")} title={t("Next sentence")} disabled={!segment || index >= total - 1} onClick={onNext}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 6l10 6-10 6z"/></svg>
        </button>
      </div>
      <div className="workspace-sentence-options">
        <fieldset className="workspace-mode-switch"><legend>{t("Playback mode")}</legend>
          <button type="button" aria-pressed={mode === 'full'} onClick={() => onModeChange('full')}>{t("Full")}</button>
          <button type="button" aria-pressed={mode === 'sentence'} disabled={!segment} onClick={() => onModeChange('sentence')}>{t("Sentence")}</button>
        </fieldset>
        <div className="workspace-sentence-tools">
          <Dropdown label={t("Playback speed")} value={String(rate)} direction="up" options={[0.5, 0.75, 1, 1.25, 1.5, 2].map(value => ({ value: String(value), label: value + "×" }))} onChange={value => onRateChange(Number(value))}/>
          <button type="button" aria-label={loop ? t("Turn sentence loop off") : t("Loop sentence")} title={loop ? t("Turn sentence loop off") : t("Loop sentence")} aria-pressed={loop} disabled={!segment || mode === 'full'} onClick={() => onLoopChange(!loop)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/></svg><span>{t("Loop")}</span>
          </button>
          <button type="button" aria-label={translationOpen ? t("Hide Chinese translation") : t("Show Chinese translation")} title={translationOpen ? t("Hide Chinese translation") : t("Show Chinese translation")} aria-expanded={translationOpen} disabled={!segment} onClick={onToggleTranslation}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h10M9 3v2m4 0c-1 5-4 8-8 10m2-6c1 3 4 5 7 6m1 4 3-8 3 8m-5-2h4"/></svg><span>{t("中文")}</span>
          </button>
        </div>
      </div>
    </div>
  </section>;
}

const formatTime = (value: number) => String(Math.floor(value / 60)) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
