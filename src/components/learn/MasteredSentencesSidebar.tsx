'use client';
import { useState } from 'react';
import { ChevronLeft, Book, Volume2, Trash2 } from 'lucide-react';
import { MasteredSentence } from '@/lib/types/progress';

interface Props {
  sentences: MasteredSentence[];
  onDelete?: (id: string) => void;
  onSelect?: (sentence: MasteredSentence) => void;
}

export default function MasteredSentencesSidebar({ sentences, onDelete, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const sentenceGroups = sentences.slice().reverse().reduce<{ date: string; sentences: MasteredSentence[] }[]>((groups, sentence) => {
    const date = new Date(sentence.masteredAt).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const group = groups[groups.length - 1];

    if (group?.date === date) {
      group.sentences.push(sentence);
    } else {
      groups.push({ date, sentences: [sentence] });
    }

    return groups;
  }, []);

  const playSavedAudio = async (sentence: MasteredSentence) => {
    if (playingId) return;
    
    // If we have a saved path, use it. Otherwise, request TTS on the fly.
    let url = sentence.audioPath;
    
    setPlayingId(sentence.id);

    try {
        if (!url) {
           // Fallback: Generate on the fly (though typically we should have it saved)
           const res = await fetch('/api/ai-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentence.content, stream: false })
          });
          if (!res.ok) throw new Error('TTS failed');
          const data = await res.json();
          if (!data?.url) throw new Error('TTS missing url');
          url = data.url;
        }

        const audio = new Audio(url);
        audio.onended = () => {
            setPlayingId(null);
            if (!sentence.audioPath && url?.startsWith('blob:')) URL.revokeObjectURL(url);
        };
        await audio.play();

    } catch (e) {
        console.error(e);
        setPlayingId(null);
    }
  };

  return (
    <>
      {/* Sidebar Container */}
      <div 
        className={`fixed left-0 top-[0px] h-full z-20 bg-[var(--paper-note)] transition-all duration-300 flex flex-col pt-20 pb-4 ${isOpen ? 'w-80' : 'w-16'}`}
      >
        {/* Toggle & Header */}
        <div className={`flex items-center flex-shrink-0 mb-4 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
           {isOpen && <h2 className="paper-title text-base tracking-tight">Mastered Sentences <span className="text-xs font-normal text-[var(--ink-3)] ml-2">({sentences.length})</span></h2>}
           <button 
             onClick={() => setIsOpen(!isOpen)}
             className="paper-btn-flat min-h-0 p-2 text-[var(--ink-2)] transition-colors"
             title={isOpen ? "Collapse library" : "Expand sentence library"}
           >
             {isOpen ? <ChevronLeft size={20} /> : <Book size={20} />}
           </button>
        </div>

        {/* Content List */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            {sentences.length === 0 ? (
                 <div className="paper-panel-soft flex flex-col items-center justify-center h-40 text-[var(--ink-3)] text-center p-4 rounded-xl">
                    <Book size={24} className="mb-2 opacity-50"/>
                    <p className="text-sm">No sentences mastered yet.</p>
                    <p className="text-xs mt-1">Keep learning!</p>
                 </div>
            ) : (
                sentenceGroups.map((group) => (
                  <section key={group.date} className="mb-5 last:mb-0">
                    <h3 className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--accent-1)]">
                      {group.date}
                    </h3>
                    {group.sentences.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelect?.(s)}
                        className="group flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-2 text-sm transition-colors hover:bg-[rgba(240,228,244,0.7)]"
                      >
                        <p className="min-w-0 flex-1 truncate font-medium leading-normal text-[var(--ink-1)]">{s.content}</p>
                        <div className="flex flex-shrink-0 items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSavedAudio(s);
                            }}
                            className={`min-h-0 rounded-full p-1.5 text-[var(--accent-1)] transition-colors hover:bg-[rgba(126,34,206,0.08)] ${playingId === s.id ? 'animate-pulse' : 'opacity-60 group-hover:opacity-100'}`}
                            title="Play audio"
                          >
                            <Volume2 size={15} />
                          </button>
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(s.id);
                              }}
                              className="rounded-full p-1.5 text-[var(--danger)] transition-colors opacity-60 hover:bg-[rgba(220,38,38,0.08)] group-hover:opacity-100"
                              title="Delete sentence"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                ))
            )}
          </div>
        )}
      </div>

      {/* Layout Spacer for Parent Flex Container */}
      <div className={`transition-all duration-300 flex-shrink-0 ${isOpen ? 'w-80' : 'w-16'}`} />
    </>
  );
}
