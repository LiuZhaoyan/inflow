import { BookOpen, Loader2 } from 'lucide-react';
import type { VocabularyWord } from '@/lib/types/vocabulary';
import WordCard from './WordCard';

interface WordGridProps {
  loading: boolean;
  words: VocabularyWord[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  flippedIds: Set<string>;
  generating: Record<string, { img?: boolean; audio?: boolean }>;
  onToggleSelection: (id: string) => void;
  onToggleFlip: (id: string) => void;
  onDelete: (id: string) => void;
  onPlayAudio: (path: string) => void;
  onGenerateImage: (word: VocabularyWord) => void;
  onGenerateAudio: (word: VocabularyWord) => void;
}

export default function WordGrid({
  loading,
  words,
  selectionMode,
  selectedIds,
  flippedIds,
  generating,
  onToggleSelection,
  onToggleFlip,
  onDelete,
  onPlayAudio,
  onGenerateImage,
  onGenerateAudio,
}: WordGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
          <BookOpen className="text-gray-400" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No words</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-2">Add a word or switch language filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {words.map((word) => (
        <WordCard
          key={word.id}
          word={word}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(word.id)}
          isFlipped={flippedIds.has(word.id)}
          generating={generating[word.id]}
          onToggleSelection={onToggleSelection}
          onToggleFlip={onToggleFlip}
          onDelete={onDelete}
          onPlayAudio={onPlayAudio}
          onGenerateImage={onGenerateImage}
          onGenerateAudio={onGenerateAudio}
        />
      ))}
    </div>
  );
}
