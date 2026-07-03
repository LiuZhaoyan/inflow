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
            className="paper-btn-ghost text-sm"
          >
            Select to Practice
          </button>
          <button
            onClick={onAddWord}
            className="paper-btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </>
      )}
    </div>
  );
}
