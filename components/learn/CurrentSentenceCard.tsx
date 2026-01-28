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
            <div className="text-center text-sm text-gray-400 italic py-4">Waiting for your coach...</div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-5 text-center shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1 block">Current Challenge</span>
            <div
                ref={sentenceRef}
                onMouseUp={onSelectionEnd}
                onTouchEnd={onSelectionEnd}
                className="flex items-center justify-center gap-3"
            >
                <p className="text-lg md:text-xl font-medium text-gray-900 leading-normal">{currentSentence}</p>
                <button
                    onClick={() => onPlayAudio(currentSentence)}
                    className={`p-2 rounded-full hover:bg-blue-100/50 text-blue-600 transition-all ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'}`}
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
                    className="fixed z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg"
                    style={{ top: selectionRect.top, left: selectionRect.left }}
                >
                    <div className="text-xs text-gray-500 mb-1">Selected</div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">{selectedText}</div>
                    <button
                        onClick={onAddSelection}
                        disabled={isAddingVocab}
                        className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {isAddingVocab ? 'Adding...' : 'Add to Vocabulary'}
                    </button>
                    {addVocabError && (
                        <div className="mt-1 text-[10px] text-red-500">{addVocabError}</div>
                    )}
                </div>
            )}
        </div>
    );
}
