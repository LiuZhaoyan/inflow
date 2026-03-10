import type { RefObject } from 'react';
import { Volume2 } from 'lucide-react';

interface CurrentSentenceCardProps {
    currentSentence: string;
    sentenceRef: RefObject<HTMLDivElement | null>;
    popoverRef: RefObject<HTMLDivElement | null>;
    selectedText: string;
    selectionRect: { top: number; left: number } | null;
    isAddingVocab: boolean;
    addVocabError: string | null;
    playing: boolean;
    onSelectionEnd: () => void;
    onPlayAudio: (text: string) => void;
    onAddSelection: () => void;
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
    onSelectionEnd,
    onPlayAudio,
    onAddSelection,
}: CurrentSentenceCardProps) {
    if (!currentSentence) {
        return (
            <div className="text-center text-sm text-[var(--ink-3)] italic py-4">Waiting for your coach...</div>
        );
    }

    return (
        <div className="paper-panel-flat rounded-[var(--radius-lg)] p-5 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-0)]"></div>
            <span className="paper-chip text-[var(--accent-1)] justify-center mb-1 block">Current Challenge</span>
            <div
                ref={sentenceRef}
                onMouseUp={onSelectionEnd}
                onTouchEnd={onSelectionEnd}
                className="flex items-center justify-center gap-3"
            >
                <p className="text-lg md:text-xl font-medium text-[var(--ink-0)] leading-normal">{currentSentence}</p>
                <button
                    onClick={() => onPlayAudio(currentSentence)}
                    className={`paper-btn-flat min-h-0 rounded-full p-2 text-[var(--accent-1)] ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'}`}
                    title="Play pronunciation"
                >
                    <Volume2 size={24} />
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
