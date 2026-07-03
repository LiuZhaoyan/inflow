import { Loader2 } from 'lucide-react';
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ink-2)]" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-20 bg-[#faf5ff] rounded-2xl border border-dashed border-[var(--line-1)]">
        <h3 className="paper-title text-2xl">No words</h3>
        <p className="paper-subtitle max-w-sm mx-auto mt-2">Add a word or switch language filters.</p>
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
