import { AudioLines, Check, Image as ImageIcon, Loader2, Play, Trash2 } from 'lucide-react';
import type { VocabularyWord } from '@/lib/types/vocabulary';

interface WordCardProps {
  word: VocabularyWord;
  selectionMode: boolean;
  isSelected: boolean;
  isFlipped: boolean;
  generating: { img?: boolean; audio?: boolean } | undefined;
  onToggleSelection: (id: string) => void;
  onToggleFlip: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerateImage: (word: VocabularyWord) => void;
  onGenerateAudio: (word: VocabularyWord) => void;
  onPlayAudio: (path: string) => void;
}

export default function WordCard({
  word,
  selectionMode,
  isSelected,
  isFlipped,
  generating,
  onToggleSelection,
  onToggleFlip,
  onDelete,
  onGenerateImage,
  onGenerateAudio,
  onPlayAudio,
}: WordCardProps) {
  return (
    <div
      className={`
        relative group bg-[var(--card)] rounded-2xl border transition-all duration-300 overflow-hidden w-[190px]
        ${
          selectionMode && isSelected
            ? 'ring-2 ring-[var(--ring)] border-transparent shadow-lg transform -translate-y-1'
            : 'border-[var(--line-0)] shadow-sm hover:shadow-xl hover:border-[var(--line-1)] hover:-translate-y-1'
        }
      `}
      onClick={() => {
        if (selectionMode) onToggleSelection(word.id);
        else onToggleFlip(word.id);
      }}
    >
      <div className="aspect-[4/3] bg-[#f3f0ff] relative overflow-hidden border-b border-[var(--line-0)]" style={{ perspective: '1000px' }}>
        <div
          className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            {word.imagePath ? (
              <img
                src={word.imagePath}
                alt={word.word}
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--ink-2)] bg-[#ede9fe]/70">
                <ImageIcon className="w-10 h-10 opacity-50" />
              </div>
            )}

            {selectionMode && (
              <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-start justify-end p-3 transition-opacity">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${
                    isSelected ? 'bg-[var(--accent-1)] border-[var(--accent-1)]' : 'bg-white border-[var(--line-0)]'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
              </div>
            )}

            {!selectionMode && (
              <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
                {word.audioPath && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayAudio(word.audioPath!);
                    }}
                    className="h-10 w-10 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-sm hover:shadow-md hover:scale-110 text-[var(--accent-1)] transition-all border border-[var(--line-0)]"
                    title="Play Pronunciation"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateImage(word);
                    }}
                    disabled={!!generating?.img}
                    className="h-8 w-8 flex items-center justify-center bg-white/95 rounded-full border border-[var(--line-0)] text-[var(--ink-2)] hover:text-[var(--accent-1)] hover:shadow-sm transition-all disabled:opacity-50"
                    title="Generate Image"
                  >
                    {generating?.img ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateAudio(word);
                    }}
                    disabled={!!generating?.audio}
                    className="h-8 w-8 flex items-center justify-center bg-white/95 rounded-full border border-[var(--line-0)] text-[var(--ink-2)] hover:text-[var(--accent-1)] hover:shadow-sm transition-all disabled:opacity-50"
                    title="Generate Pronunciation"
                  >
                    {generating?.audio ? <Loader2 className="w-4 h-4 animate-spin" /> : <AudioLines className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className="absolute inset-0 bg-white flex items-center justify-center p-4"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)] mb-2">Definition</div>
              {word.definition ? (
                <p className="text-sm text-[var(--ink-1)] leading-snug">{word.definition}</p>
              ) : (
                <p className="text-sm text-[var(--ink-2)] italic">No definition</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="paper-title text-2xl tracking-tight leading-none">{word.word}</h3>
          {!selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(word.id);
              }}
              className="text-[var(--ink-2)] hover:text-[var(--danger)] transition-colors -mr-1 -mt-1 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-3 text-[10px] text-[var(--ink-2)] font-semibold uppercase tracking-wider">
          {new Date(word.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
