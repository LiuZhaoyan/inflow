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
    <div className="flex items-center gap-3 mt-8">
      {selectionMode ? (
        <>
          <span className="text-sm font-medium text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            {selectedCount} selected
          </span>
          <button
            onClick={onGenerateStory}
            disabled={selectedCount === 0 || isGeneratingStory}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200"
          >
            {isGeneratingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generate Story
          </button>
          <button
            onClick={onCancelSelection}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onStartSelection}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 font-medium rounded-lg text-sm hover:bg-gray-50 hover:text-blue-600 transition-colors"
          >
            Select to Practice
          </button>
          <button
            onClick={onAddWord}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg text-sm hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </>
      )}
    </div>
  );
}
