'use client';

import React, { useState } from 'react';
import useVocabularyData from '@/hooks/vocabulary/useVocabularyData';
import useVocabularyActions from '@/hooks/vocabulary/useVocabularyActions';
import useStoryMode from '@/hooks/vocabulary/useStoryMode';
import useCardFlip from '@/hooks/vocabulary/useCardFlip';
import AddWordForm from '@/components/vocabulary/AddWordForm';
import LanguageFilterRail from '@/components/vocabulary/LanguageFilterRail';
import StorySidebar from '@/components/vocabulary/StorySidebar';
import VocabularyHeader from '@/components/vocabulary/VocabularyHeader';
import VocabularyLayout from '@/components/vocabulary/VocabularyLayout';
import VocabularyTitle from '@/components/vocabulary/VocabularyTitle';
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
    <VocabularyLayout>
      <VocabularyHeader />

      <main className="w-full px-6 lg:px-12 pb-20 pt-10">
         
         {/* Title Section */}
         <div className="mb-12 max-w-4xl mx-auto">
            <div className="flex justify-between items-start">
              <VocabularyTitle title="Vocabulary &" highlight="Flashcards" />
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

         <div className="max-w-4xl mx-auto space-y-10">
             
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
               isGeneratingStory={isGeneratingStory}
               onToggle={() => setIsStorySidebarOpen(prev => !prev)}
               onClose={() => setIsStorySidebarOpen(false)}
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
    </VocabularyLayout>
  );
}
