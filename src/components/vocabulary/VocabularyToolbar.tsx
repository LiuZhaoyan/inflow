import { Loader2, Plus, Wand2, X } from 'lucide-react';

interface VocabularyToolbarProps {
  selectionMode: boolean;
  selectedCount: number;
  isGeneratingStory: boolean;
  onGenerateStory: () => void;
  onCancelSelection: () => void;
  onStartSelection: () => void;
  onAddWord: () => void;
}

export default function VocabularyToolbar({
  selectionMode,
  selectedCount,
  isGeneratingStory,
  onGenerateStory,
  onCancelSelection,
  onStartSelection,
  onAddWord,
}: VocabularyToolbarProps) {
  return (
    <div className="flex w-full items-center justify-end gap-3 mt-4">
      {selectionMode ? (
        <>
          <span className="paper-chip">
            {selectedCount} selected
          </span>
          <button
            onClick={onGenerateStory}
            disabled={selectedCount === 0 || isGeneratingStory}
            className="paper-btn-primary text-sm"
          >
            {isGeneratingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generate Story
          </button>
          <button
            onClick={onCancelSelection}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-[var(--line-0)] bg-[#faf5ff] text-[var(--ink-2)] hover:text-[var(--accent-1)]"
          >
            <X className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onStartSelection}
            className="inline-flex h-[52px] w-[140px] items-center justify-center rounded-xl border border-[var(--line-0)] bg-[var(--paper-note)] px-3 text-sm font-bold text-[var(--ink-1)] shadow-[0_2px_0_var(--line-0)] transition-colors cursor-pointer hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Select to Practice
          </button>
          <button
            onClick={onAddWord}
            className="inline-flex h-[52px] w-[140px] items-center justify-center gap-2 rounded-xl border border-[#5b21b6] bg-[var(--accent-1)] px-3 text-sm font-extrabold text-white shadow-[0_4px_0_#5b21b6] transition-[filter,box-shadow] cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </>
      )}
    </div>
  );
}
