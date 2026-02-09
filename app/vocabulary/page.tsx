'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Plus, Play, Trash2, Wand2, X, Check, Loader2, 
  Image as ImageIcon,
  ArrowLeft,
  AudioLines
} from 'lucide-react';
import { resolveLanguageLabel } from '@/lib/language';
import useVocabularyData from '@/hooks/vocabulary/useVocabularyData';
import useVocabularyActions from '@/hooks/vocabulary/useVocabularyActions';
import useStoryMode from '@/hooks/vocabulary/useStoryMode';
import useCardFlip from '@/hooks/vocabulary/useCardFlip';

export default function VocabularyPage() {
  const { words, setWords, loading } = useVocabularyData();
  const {
    generating,
    isAdding,
    newWord,
    newDefinition,
    addingStatus,
    setIsAdding,
    setNewWord,
    setNewDefinition,
    handleAddWord,
    handleDelete,
    generateImageForWord,
    generateAudioForWord,
    playAudio,
  } = useVocabularyActions({ words, setWords });
  const {
    selectionMode,
    selectedIds,
    story,
    isGeneratingStory,
    isStorySidebarOpen,
    setSelectionMode,
    setIsStorySidebarOpen,
    toggleSelection,
    generateStory,
    resetStory,
  } = useStoryMode({ words });
  const { flippedIds, toggleFlip } = useCardFlip();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const availableLanguages = Array.from(
    new Set(words.map(w => w.language).filter(Boolean) as string[])
  ).sort();

  const filteredWords = selectedLanguage === 'all'
    ? words
    : words.filter(w => w.language === selectedLanguage);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">
      {/* Header - Consistent with Home Page */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
          >
            <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
            Inflow
          </Link>
          <nav className="text-sm text-gray-500 font-medium">
            <span>Beta v0.1</span>
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
                           onClick={resetStory}
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
                             {addingStatus === 'saving' && <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</>}
                          </button>
                      </div>
                  </form>
                </div>
             )}

             {/* Left Sidebar - Language Tags */}
             <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
               <button
                 onClick={() => setSelectedLanguage('all')}
                 className={`bg-white border border-gray-200 shadow-sm rounded-r-full px-3 py-2 text-sm text-gray-700 cursor-pointer hover:text-blue-700 hover:border-blue-300 ${selectedLanguage === 'all' ? 'text-blue-700 border-blue-300' : ''}`}
                 title="All"
               >
                 <span className="inline-flex items-center gap-1">
                   All
                 </span>
               </button>
               {availableLanguages.map(code => (
                 <button
                   key={code}
                   onClick={() => setSelectedLanguage(code)}
                   className={`bg-white border border-gray-200 shadow-sm rounded-r-full px-3 py-2 text-sm text-gray-700 cursor-pointer hover:text-blue-700 hover:border-blue-300 ${selectedLanguage === code ? 'text-blue-700 border-blue-300' : ''}`}
                   title={resolveLanguageLabel(code)}
                 >
                   <span className="inline-flex items-center gap-1">
                     {resolveLanguageLabel(code)}
                   </span>
                 </button>
               ))}
             </div>

             {/* Right Sidebar Toggle Handle */}
             <button
               onClick={() => setIsStorySidebarOpen(prev => !prev)}
               className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white border border-gray-200 shadow-sm rounded-l-full px-3 py-2 text-sm text-gray-700 hover:text-indigo-700 hover:border-indigo-300"
               title={isStorySidebarOpen ? 'Hide Story' : 'Show Story'}
             >
               <span className="inline-flex items-center gap-1">
                 <Wand2 className="w-4 h-4 text-indigo-600" />
                 Story
               </span>
             </button>

             {/* Grid */}
             {loading ? (
                 <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300"/></div>
             ) : filteredWords.length === 0 ? (
                 <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                        <BookOpen className="text-gray-400" size={24}/>
                    </div>
                <h3 className="text-lg font-semibold text-gray-900">No words</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-2">Add a word or switch language filters.</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredWords.map(word => (
                        <div 
                          key={word.id} 
                          className={`
                            relative group bg-white rounded-2xl border transition-all duration-300 overflow-hidden
                            ${selectionMode && selectedIds.has(word.id) 
                                ? 'ring-2 ring-indigo-500 border-transparent shadow-lg shadow-indigo-100 transform -translate-y-1' 
                                : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-1'}
                          `}
                          onClick={() => { if (selectionMode) toggleSelection(word.id); else toggleFlip(word.id); }}
                       >
                          
                          {/* Card Image */}
                          <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden border-b border-gray-50" style={{ perspective: '1000px' }}>
                            <div className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${flippedIds.has(word.id) ? 'rotate-y-180' : ''}`} style={{ transform: flippedIds.has(word.id) ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                              {/* Front Side */}
                              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                                {word.imagePath ? (
                                  <img src={word.imagePath} alt={word.word} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"/>
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

                              {/* Back Side */}
                              <div
                                className="absolute inset-0 bg-white flex items-center justify-center p-4"
                                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                              >
                                <div className="text-center">
                                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Definition</div>
                                  {word.definition ? (
                                    <p className="text-sm text-gray-700 leading-snug">{word.definition}</p>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No definition</p>
                                  )}
                                </div>
                              </div>
                            </div>
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
      {/* Fixed Right Sidebar for Story */}
      <aside
        className={`fixed right-0 top-24 z-40 bg-white border-l border-gray-200 shadow-lg rounded-l-2xl p-4 sm:w-[290px] w-[80vw] h-[calc(100vh-7rem)] overflow-y-auto transition-transform duration-300 ${isStorySidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!isStorySidebarOpen}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-indigo-900">
            <Wand2 className="text-indigo-600" size={18} />
            Generated Story
          </div>
          <button
            onClick={() => setIsStorySidebarOpen(false)}
            className="text-gray-400 hover:text-gray-700 rounded-lg p-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isGeneratingStory ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </div>
        ) : story ? (
          <div
            className="prose prose-indigo max-w-none text-gray-800 leading-relaxed font-medium"
            dangerouslySetInnerHTML={{
              __html: story.replace(/\*\*(.*?)\*\*/g,
                '<span class="text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-bold mx-0.5 shadow-sm border border-indigo-200">$1</span>')
            }}
          />
        ) : (
          <div className="text-sm text-gray-500">
            No story yet. Select words and click Generate Story.
          </div>
        )}
      </aside>
    </div>
  );
}
