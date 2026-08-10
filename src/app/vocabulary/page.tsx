'use client';

import { useState } from 'react';
import useVocabularyData from '@/hooks/vocabulary/useVocabularyData';
import useVocabularyActions from '@/hooks/vocabulary/useVocabularyActions';
import useStoryMode from '@/hooks/vocabulary/useStoryMode';
import useCardFlip from '@/hooks/vocabulary/useCardFlip';
import AddWordForm from '@/components/vocabulary/AddWordForm';
import LanguageFilterRail from '@/components/vocabulary/LanguageFilterRail';
import StorySidebar from '@/components/vocabulary/StorySidebar';
import Header from '@/components/Header';
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
  } = useVocabularyActions({ setWords });
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
    <div className="min-h-screen bg-[var(--paper-0)] text-[var(--foreground)] selection:bg-[#ede9fe] selection:text-[#4c1d95]">
      <Header variant="learn" learnTitle="Vocabulary" learnSubtitle="STUDY COLLECTION" />

      <div className="sticky top-[52px] z-40 h-[72px] bg-[var(--paper-0)]">
        <div className="grid h-full grid-cols-[1fr_auto_1fr] items-start">
          <div />
          <LanguageFilterRail
            availableLanguages={availableLanguages}
            selectedLanguage={selectedLanguage}
            onSelect={setSelectedLanguage}
          />
          <div className="flex justify-end">
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
        </div>
      </div>

      <main className="w-full px-6 lg:px-12 pb-20">
         <div>
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
