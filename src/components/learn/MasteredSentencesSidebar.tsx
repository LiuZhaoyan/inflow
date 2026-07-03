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
          <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
            {sentences.length === 0 ? (
                 <div className="paper-panel-soft flex flex-col items-center justify-center h-40 text-[var(--ink-3)] text-center p-4 rounded-xl">
                    <Book size={24} className="mb-2 opacity-50"/>
                    <p className="text-sm">No sentences mastered yet.</p>
                    <p className="text-xs mt-1">Keep learning!</p>
                 </div>
            ) : (
                sentences.slice().reverse().map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onSelect?.(s)}
                      className="paper-panel-soft group p-2.5 text-sm transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-1.5">
                         <p className="text-[var(--ink-1)] font-medium leading-normal flex-1">{s.content}</p>
                         <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSavedAudio(s);
                            }}
                            className={`paper-btn-flat min-h-0 rounded-full p-1.5 text-[var(--accent-1)] ${playingId === s.id ? 'animate-pulse' : 'opacity-60 group-hover:opacity-100'}`}
                            title="Play audio"
                           >
                            <Volume2 size={16} />
                           </button>
                           {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(s.id);
                              }}
                              className="rounded-full p-1.5 text-[var(--danger)] transition-colors opacity-60 group-hover:opacity-100 hover:bg-[rgba(180,88,79,0.08)]"
                              title="Delete sentence"
                            >
                              <Trash2 size={15} />
                            </button>
                           )}
                         </div>
                      </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="paper-pill-soft paper-pill-ink text-[10px] font-mono">
                                {new Date(s.masteredAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
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
