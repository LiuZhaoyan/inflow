'use client';

import React, { useState } from 'react';
import useVocabularyData from '@/hooks/vocabulary/useVocabularyData';
import useVocabularyActions from '@/hooks/vocabulary/useVocabularyActions';
import useStoryMode from '@/hooks/vocabulary/useStoryMode';
import useCardFlip from '@/hooks/vocabulary/useCardFlip';
import AddWordForm from '@/components/vocabulary/AddWordForm';
import LanguageFilterRail from '@/components/vocabulary/LanguageFilterRail';
import StorySidebar from '@/components/vocabulary/StorySidebar';
import Header from '@/components/Header';
import SectionTitle from '@/components/SectionTitle';
import VocabularyToolbar from '@/components/vocabulary/VocabularyToolbar';
import WordGrid from '@/components/vocabulary/WordGrid';

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
    translation,
    stories,
    activeStoryId,
    isGeneratingStory,
    isStorySidebarOpen,
    setSelectionMode,
    setIsStorySidebarOpen,
    toggleSelection,
    generateStory,
    resetStory,
    selectStory,
    deleteStory,
    updateStoryAudioPath,
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
      <Header />

      <main className="w-full px-6 lg:px-12 pb-20">
         
         {/* Title Section */}
         <div className="mb-4 max-w-4xl mx-auto">
            <div className="flex flex-col">
              <SectionTitle
                eyebrow="Your space"
                title="Vocabulary &"
                highlight="Flashcards"
                description="Browse your collection, open a story, or upload fresh input."
              />
            </div>
         </div>

         <div className="sticky top-[var(--header-height)] z-40 bg-[#FDFDFD]/90 backdrop-blur-md">
           <div className="max-w-4xl mx-auto">
             <VocabularyToolbar
               selectionMode={selectionMode}
               selectedCount={selectedIds.size}
               isGeneratingStory={isGeneratingStory}
               onGenerateStory={generateStory}
               onCancelSelection={resetStory}
               onStartSelection={() => setSelectionMode(true)}
               onAddWord={() => setIsAdding(true)}
             />
           </div>
         </div>

         <div className="max-w-4xl mx-auto space-y-8 pt-6">
             
             <AddWordForm
              isOpen={isAdding}
              newWord={newWord}
              newDefinition={newDefinition}
              addingStatus={addingStatus}
              onChangeWord={setNewWord}
              onChangeDefinition={setNewDefinition}
              onSubmit={handleAddWord}
              onClose={() => setIsAdding(false)}
             />

             <LanguageFilterRail
               availableLanguages={availableLanguages}
               selectedLanguage={selectedLanguage}
               onSelect={setSelectedLanguage}
             />

             <StorySidebar
               isOpen={isStorySidebarOpen}
               story={story}
              translation={translation}
               stories={stories}
               activeStoryId={activeStoryId}
               isGeneratingStory={isGeneratingStory}
               onToggle={() => setIsStorySidebarOpen(prev => !prev)}
               onClose={() => setIsStorySidebarOpen(false)}
               onSelectStory={selectStory}
               onDeleteStory={deleteStory}
               onUpdateStoryAudio={updateStoryAudioPath}
             />

             <WordGrid
               loading={loading}
               words={filteredWords}
               selectionMode={selectionMode}
               selectedIds={selectedIds}
               flippedIds={flippedIds}
               generating={generating}
               onToggleSelection={toggleSelection}
               onToggleFlip={toggleFlip}
               onDelete={handleDelete}
               onPlayAudio={playAudio}
               onGenerateImage={generateImageForWord}
               onGenerateAudio={generateAudioForWord}
             />
         </div>
      </main>
    </div>
  );
}
