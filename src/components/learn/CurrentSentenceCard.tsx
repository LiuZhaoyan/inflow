import type { RefObject } from 'react';
import { CheckCircle, TrendingDown, TrendingUp, Volume2 } from 'lucide-react';
import type { LearnFeedbackRating } from '@/hooks/learn/services/learnChatApi';

interface CurrentSentenceCardProps {
    currentSentence: string;
    sentenceRef: RefObject<HTMLDivElement | null>;
    popoverRef: RefObject<HTMLDivElement | null>;
    selectedText: string;
    selectionRect: { top: number; left: number } | null;
    isAddingVocab: boolean;
    addVocabError: string | null;
    playing: boolean;
    feedbackLoading: boolean;
    onSelectionEnd: () => void;
    onPlayAudio: (text: string) => void;
    onAddSelection: () => void;
    onFeedback: (rating: LearnFeedbackRating) => void;
}

export default function CurrentSentenceCard({
    currentSentence,
    sentenceRef,
    popoverRef,
    selectedText,
    selectionRect,
    isAddingVocab,
    addVocabError,
    playing,
    feedbackLoading,
    onSelectionEnd,
    onPlayAudio,
    onAddSelection,
    onFeedback,
}: CurrentSentenceCardProps) {
    if (!currentSentence) {
        return (
            <div className="text-center text-sm text-[var(--ink-3)] italic py-4">Waiting for your coach...</div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--learn-line)] bg-[var(--learn-surface)] p-5 text-center">
            <div className="absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-[var(--accent-0)]" />
            <span className="paper-chip mb-4 inline-flex border-l-2 border-[var(--accent-0)] pl-2 text-[var(--accent-1)]">Current Challenge</span>
            <div className="relative mx-auto max-w-3xl pr-12">
                <div
                    ref={sentenceRef}
                    onMouseUp={onSelectionEnd}
                    onTouchEnd={onSelectionEnd}
                >
                    <p className="font-serif text-left text-xl font-medium leading-relaxed text-[var(--ink-0)] sm:text-center sm:text-2xl">{currentSentence}</p>
                </div>
                <button
                    onClick={() => onPlayAudio(currentSentence)}
                    className={`absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl border border-[var(--learn-line)] bg-[var(--learn-note)] text-[var(--accent-1)] shadow-[0_2px_0_var(--learn-line)] transition-colors hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'}`}
                    title="Play pronunciation"
                    aria-label="Play pronunciation"
                >
                    <Volume2 size={20} />
                </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1 border-t border-[var(--learn-line)] pt-3" role="group" aria-label="Sentence difficulty feedback">
                <button
                    type="button"
                    onClick={() => onFeedback('too_hard')}
                    disabled={feedbackLoading}
                    className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--learn-note)] hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    title="This sentence is too hard"
                >
                    <TrendingDown size={14} />
                    Too hard
                </button>
                <button
                    type="button"
                    onClick={() => onFeedback('just_right')}
                    disabled={feedbackLoading}
                    className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--learn-note)] hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    title="This sentence feels just right"
                >
                    <CheckCircle size={14} />
                    Just right
                </button>
                <button
                    type="button"
                    onClick={() => onFeedback('too_easy')}
                    disabled={feedbackLoading}
                    className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--learn-note)] hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    title="This sentence is too easy"
                >
                    <TrendingUp size={14} />
                    Too easy
                </button>
            </div>
            {selectionRect && selectedText && (
                <div
                    ref={popoverRef}
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    className="paper-popover fixed z-50 -translate-x-1/2 px-3 py-2"
                    style={{ top: selectionRect.top, left: selectionRect.left }}
                >
                    <div className="text-xs text-[var(--ink-3)] mb-1">Selected</div>
                    <div className="text-sm font-semibold text-[var(--ink-0)] mb-2">{selectedText}</div>
                    <button
                        onClick={onAddSelection}
                        disabled={isAddingVocab}
                        className="paper-btn-primary w-full min-h-0 px-3 py-1.5 text-xs"
                    >
                        {isAddingVocab ? 'Adding...' : 'Add to Vocabulary'}
                    </button>
                    {addVocabError && (
                        <div className="paper-alert-soft-danger mt-2 px-2 py-1 text-[10px]">{addVocabError}</div>
                    )}
                </div>
            )}
        </div>
    );
}
