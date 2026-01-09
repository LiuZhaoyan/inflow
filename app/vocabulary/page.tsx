'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Plus, Play, Trash2, Wand2, X, Check, Loader2, 
  Image as ImageIcon,
  ArrowLeft,
  AudioLines
} from 'lucide-react';

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  contextSentence?: string;
  translation?: string;
  imagePath?: string;
  audioPath?: string;
  createdAt: number;
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, { img?: boolean; audio?: boolean }>>({});
  
  // Add Word State
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [addingStatus, setAddingStatus] = useState<'idle' | 'generating' | 'saving'>('idle');

  // Selection & Story Mode State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  useEffect(() => {
    fetchVocabulary();
  }, []);

  const fetchVocabulary = async () => {
    try {
      const res = await fetch('/api/vocabulary');
      if (res.ok) {
        const data = await res.json();
        // Sort by newest first
        setWords(data.sort((a: VocabularyWord, b: VocabularyWord) => b.createdAt - a.createdAt));
      }
    } catch (err) {
      console.error('Failed to load vocabulary', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    setAddingStatus('generating');

    try {
      // 1. Parallel: Generate Image & Audio
      const imagePromise = fetch('/api/ai-depict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Create a minimal, flat scene that clearly shows the meaning of "${newWord}". Flashcard-friendly, white background, single focal action or object, a few contextual props, no text or letters, high contrast, kid-friendly, universal symbols.` }),
      }).then(res => {
         if(!res.ok) throw new Error("Image gen failed");
         return res.json();
      });

      const audioPromise = fetch('/api/ai-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newWord }),
      }).then(res => {
         if(!res.ok) throw new Error("TTS failed");
         return res.json();
      });

      const [imageRes, audioRes] = await Promise.all([imagePromise, audioPromise]);

      let imagePath = '';
      if (imageRes.taskId) {
          // Poll for image
          const remoteUrl = await pollForImage(imageRes.taskId);
          if (remoteUrl) {
            try {
              const saveRes = await fetch('/api/save-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: remoteUrl })
              });
              const saveData = await saveRes.json();
              imagePath = saveData.url || '';
            } catch (e) {
              console.error('Failed to save image locally, fallback to remote URL');
              imagePath = remoteUrl;
            }
          }
      }

      const audioPath = audioRes.url || '';

      // 2. Save
      setAddingStatus('saving');
      const saveRes = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: newWord,
          definition: newDefinition,
          imagePath,
          audioPath
        }),
      });

      if (saveRes.ok) {
        setNewWord('');
        setNewDefinition('');
        setIsAdding(false); // Close form on success
        fetchVocabulary();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create card. Please check your API keys and try again.');
    } finally {
      setAddingStatus('idle');
    }
  };

  const pollForImage = async (taskId: string): Promise<string> => {
    return new Promise((resolve) => {
       const interval = setInterval(async () => {
          try {
             const res = await fetch(`/api/ai-depict?taskId=${taskId}`);
             const data = await res.json();
             if (data.status === 'completed') {
                clearInterval(interval);
                resolve(data.imageUrl);
             } else if (data.status === 'failed') {
                clearInterval(interval);
                resolve('');
             }
          } catch {
             clearInterval(interval);
             resolve('');
          }
       }, 2000);
    });
  };

  const playAudio = (path: string) => {
     try {
       const audio = new Audio(path);
       audio.play();
     } catch (e) {
        console.error("Failed to play audio", e);
     }
  };

  const setGeneratingState = (id: string, key: 'img' | 'audio', value: boolean) => {
    setGenerating(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const generateImageForWord = async (word: VocabularyWord) => {
    setGeneratingState(word.id, 'img', true);
    try {
      const res = await fetch('/api/ai-depict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Create a minimal, flat scene that clearly shows the meaning of "${word.word}". Flashcard-friendly, white background, single focal action or object, a few contextual props, no text or letters, high contrast, kid-friendly, universal symbols.` })
      });
      if (!res.ok) throw new Error('Image task start failed');
      const data = await res.json();
      let imagePath = '';
      if (data.taskId) {
        const remoteUrl = await pollForImage(data.taskId);
        if (remoteUrl) {
          try {
            const saveRes = await fetch('/api/save-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: remoteUrl })
            });
            const saveData = await saveRes.json();
            imagePath = saveData.url || '';
          } catch (e) {
            imagePath = remoteUrl;
          }
        }
      }
      if (imagePath) {
        // update DB
        const putRes = await fetch('/api/vocabulary', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: word.id, imagePath })
        });
        if (putRes.ok) {
          setWords(prev => prev.map(w => w.id === word.id ? { ...w, imagePath } : w));
        }
      }
    } catch (err) {
      console.error('Generate image failed', err);
      alert('Failed to generate image');
    } finally {
      setGeneratingState(word.id, 'img', false);
    }
  };

  const generateAudioForWord = async (word: VocabularyWord) => {
    setGeneratingState(word.id, 'audio', true);
    try {
      const res = await fetch('/api/ai-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word.word })
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();
      const audioPath = data.url || '';
      if (audioPath) {
        const putRes = await fetch('/api/vocabulary', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: word.id, audioPath })
        });
        if (putRes.ok) {
          setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioPath } : w));
        }
      }
    } catch (err) {
      console.error('Generate audio failed', err);
      alert('Failed to generate pronunciation');
    } finally {
      setGeneratingState(word.id, 'audio', false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    await fetch(`/api/vocabulary?id=${id}`, { method: 'DELETE' });
    setWords(words.filter(w => w.id !== id));
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const generateStory = async () => {
    if (selectedIds.size === 0) return;
    setIsGeneratingStory(true);
    setStory(null);
    try {
       const selectedWords = words.filter(w => selectedIds.has(w.id)).map(w => w.word);
       const res = await fetch('/api/ai-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: selectedWords })
       });
       const data = await res.json();
       setStory(data.story);
    } catch (err) {
       console.error(err);
       alert('Failed to generate story');
    } finally {
       setIsGeneratingStory(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">
      {/* Header - Consistent with Docs Page */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
          >
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <BookOpen size={20} />
            </div>
            Inflow
          </Link>
          <nav className="flex items-center gap-4">
             <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Beta v0.1</span>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 pb-20 pt-10">
         
         {/* Title Section */}
         <div className="mb-12 max-w-4xl mx-auto">
             <div className="flex justify-between items-start">
               <div>
                  <Link href="/" className="group mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                    <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                    Back to Home
                  </Link>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                    Vocabulary & <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      Flashcards
                    </span>
                  </h1>
               </div>
               
               {/* Toolbar Actions */}
               <div className="flex items-center gap-3 mt-8">
                   {selectionMode ? (
                     <>
                        <span className="text-sm font-medium text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                          {selectedIds.size} selected
                        </span>
                        <button 
                           onClick={generateStory}
                           disabled={selectedIds.size === 0 || isGeneratingStory}
                           className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200"
                        >
                           {isGeneratingStory ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                           Generate Story
                        </button>
                        <button 
                           onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); setStory(null); }}
                           className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                        >
                           <X className="w-5 h-5"/>
                        </button>
                     </>
                   ) : (
                     <>
                        <button 
                            onClick={() => setSelectionMode(true)}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 font-medium rounded-lg text-sm hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                            Select to Practice
                        </button>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg text-sm hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Word
                        </button>
                     </>
                   )}
               </div>
             </div>
         </div>

         <div className="max-w-4xl mx-auto space-y-10">
             
             {/* Add Word Form */}
             {isAdding && (
                <div className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2 relative">
                  <button 
                    onClick={() => setIsAdding(false)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5"/>
                  </button>

                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                     New Flashcard
                  </h3>
                  
                  <form onSubmit={handleAddWord} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Word</label>
                              <input 
                                 type="text" 
                                 placeholder="e.g. Serendipity" 
                                 className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                 value={newWord}
                                 onChange={e => setNewWord(e.target.value)}
                                 autoFocus
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Definition (Optional)</label>
                              <input 
                                 type="text" 
                                 placeholder="Meaning in context..." 
                                 className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                 value={newDefinition}
                                 onChange={e => setNewDefinition(e.target.value)}
                              />
                          </div>
                      </div>
                      
                      <div className="flex justify-start pt-2">
                        <button 
                             type="submit" 
                             disabled={addingStatus !== 'idle'}
                             className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
                          >
                             {addingStatus === 'idle' && 'Create Card'}
                             {addingStatus === 'generating' && <><Loader2 className="w-4 h-4 animate-spin"/> Generating Assets...</>}
                             {addingStatus === 'saving' && <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</>}
                          </button>
                      </div>
                  </form>
                </div>
             )}

             {/* Story View */}
             {story && (
                 <div className="relative p-8 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm">
                     <button onClick={() => setStory(null)} className="absolute top-4 right-4 text-indigo-300 hover:text-indigo-600 transition-colors">
                        <X className="w-5 h-5"/>
                     </button>
                     <div className="flex items-center gap-2 font-semibold text-indigo-900 mb-4">
                        <Wand2 className="text-indigo-600" size={20} />
                        Generated Story
                     </div>
                     <div 
                        className="prose prose-indigo max-w-none text-gray-800 leading-relaxed font-medium" 
                        dangerouslySetInnerHTML={{ __html: story.replace(/\*\*(.*?)\*\*/g, '<span class="text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-bold mx-0.5 shadow-sm border border-indigo-200">$1</span>') }} 
                     />
                 </div>
             )}

             {/* Grid */}
             {loading ? (
                 <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300"/></div>
             ) : words.length === 0 ? (
                 <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                        <BookOpen className="text-gray-400" size={24}/>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No words yet</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">Add a word to generate a flashcard with AI-powered image and pronunciation.</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {words.map(word => (
                       <div 
                          key={word.id} 
                          className={`
                            relative group bg-white rounded-2xl border transition-all duration-300 overflow-hidden
                            ${selectionMode && selectedIds.has(word.id) 
                                ? 'ring-2 ring-indigo-500 border-transparent shadow-lg shadow-indigo-100 transform -translate-y-1' 
                                : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-1'}
                          `}
                          onClick={() => selectionMode && toggleSelection(word.id)}
                       >
                          
                          {/* Card Image */}
                          <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden border-b border-gray-50">
                              {word.imagePath ? (
                                  <img src={word.imagePath} alt={word.word} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50/50">
                                      <ImageIcon className="w-10 h-10 opacity-50"/>
                                  </div>
                              )}
                              
                              {/* Selection Overlay */}
                              {selectionMode && (
                                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-start justify-end p-3 transition-opacity">
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${selectedIds.has(word.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}>
                                          {selectedIds.has(word.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]"/>}
                                      </div>
                                  </div>
                              )}
                              
                              {/* Floating Controls */}
                              {!selectionMode && (
                                <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
                                  {word.audioPath && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); playAudio(word.audioPath!); }}
                                      className="h-10 w-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:shadow-md hover:scale-110 text-blue-600 transition-all border border-gray-100"
                                      title="Play Pronunciation"
                                    >
                                      <Play className="w-4 h-4 fill-current ml-0.5"/>
                                    </button>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); generateImageForWord(word); }}
                                      disabled={!!generating[word.id]?.img}
                                      className="h-8 w-8 flex items-center justify-center bg-white/90 rounded-full border border-gray-100 text-gray-700 hover:text-blue-600 hover:shadow-sm transition-all disabled:opacity-50"
                                      title="Generate Image"
                                    >
                                      {generating[word.id]?.img ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4"/>}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); generateAudioForWord(word); }}
                                      disabled={!!generating[word.id]?.audio}
                                      className="h-8 w-8 flex items-center justify-center bg-white/90 rounded-full border border-gray-100 text-gray-700 hover:text-blue-600 hover:shadow-sm transition-all disabled:opacity-50"
                                      title="Generate Pronunciation"
                                    >
                                      {generating[word.id]?.audio ? <Loader2 className="w-4 h-4 animate-spin"/> : <AudioLines className="w-4 h-4"/>}
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Card Content */}
                          <div className="p-5">
                              <div className="flex justify-between items-start mb-2">
                                 <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{word.word}</h3>
                                 {!selectionMode && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(word.id); }} 
                                        className="text-gray-300 hover:text-red-500 transition-colors -mr-1 -mt-1 p-1"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                 )}
                              </div>
                              {word.definition ? (
                                <p className="text-sm text-gray-600 leading-snug line-clamp-2 font-medium">{word.definition}</p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No definition</p>
                              )}
                              <div className="mt-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                {new Date(word.createdAt).toLocaleDateString()}
                              </div>
                          </div>
                       </div>
                    ))}
                 </div>
             )}
         </div>
      </main>
    </div>
  );
}
