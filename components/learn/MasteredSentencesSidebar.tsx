'use client';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Book, Volume2, Trash2 } from 'lucide-react';

export interface MasteredSentence {
  id: string;
  content: string;
  masteredAt: number;
  audioPath?: string;
  context?: string;
  messageId?: string;
  languageCode?: string;
}

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
        className={`fixed left-0 top-[0px] h-full z-20 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col pt-20 pb-4 shadow-sm ${isOpen ? 'w-80' : 'w-16'}`}
      >
        {/* Toggle & Header */}
        <div className={`flex items-center flex-shrink-0 mb-4 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
           {isOpen && <h2 className="font-bold text-gray-800 tracking-tight">Mastered Sentences <span className="text-xs font-normal text-gray-500 ml-2">({sentences.length})</span></h2>}
           <button 
             onClick={() => setIsOpen(!isOpen)}
             className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
             title={isOpen ? "Collapse library" : "Expand sentence library"}
           >
             {isOpen ? <ChevronLeft size={20} /> : <Book size={20} />}
           </button>
        </div>

        {/* Content List */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
            {sentences.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center p-4 border-2 border-dashed border-gray-100 rounded-xl">
                    <Book size={24} className="mb-2 opacity-50"/>
                    <p className="text-sm">No sentences mastered yet.</p>
                    <p className="text-xs mt-1">Keep learning!</p>
                 </div>
            ) : (
                sentences.slice().reverse().map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onSelect?.(s)}
                      className="group p-3 bg-gray-50 rounded-xl text-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                         <p className="text-gray-800 font-medium leading-relaxed flex-1">{s.content}</p>
                         <div className="flex flex-col items-end gap-2 flex-shrink-0">
                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSavedAudio(s);
                            }}
                            className={`p-1.5 rounded-full hover:bg-blue-100/50 text-blue-500 transition-colors ${playingId === s.id ? 'animate-pulse text-blue-700' : 'opacity-60 group-hover:opacity-100'}`}
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
                              className="p-1.5 rounded-full hover:bg-red-100/60 text-red-500 transition-colors opacity-60 group-hover:opacity-100"
                              title="Delete sentence"
                            >
                              <Trash2 size={15} />
                            </button>
                           )}
                         </div>
                      </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-100">
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
      <div className={`transition-all duration-300 flex-shrink-0 bg-gray-50 ${isOpen ? 'w-80' : 'w-16'}`} />
    </>
  );
}
