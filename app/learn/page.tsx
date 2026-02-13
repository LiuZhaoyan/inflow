'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import MasteredSentencesSidebar from '@/components/learn/MasteredSentencesSidebar';
import ChatArea from '@/components/learn/ChatArea';
import ContextSwitcher from '@/components/learn/ContextSwitcher';
import LanguageSwitcher from '@/components/learn/LanguageSwitcher';
import ControlButtons from '@/components/learn/ControlButtons';
import CurrentSentenceCard from '@/components/learn/CurrentSentenceCard';
import DifficultyIndicator from '@/components/learn/DifficultyIndicator';
import PlacementTest from '@/components/learn/PlacementTest';
import useAudioTTS from '@/hooks/learn/useAudioTTS';
import useLearnChat from '@/hooks/learn/useLearnChat';
import useSelectionPopover from '@/hooks/learn/useSelectionPopover';

export default function LearnPage() {
    const {
        messages,
        currentSentence,
        loading,
        selectedContext,
        selectedLanguage,
        showContextMenu,
        masteredSentences,
        userProfile,
        profileLoading,
        messagesEndRef,
        messageRefs,
        difficultyLevel,
        difficultyDirection,
        difficultyPerformance,
        placementCompleted,
        placementLoading,
        setPlacementCompleted,
        setDifficultyLevel: setDifficultyLevelState,
        setShowContextMenu,
        handleAction,
        switchContext,
        switchLanguage,
        handleDeleteMasteredSentence,
    } = useLearnChat();

    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    const {
        sentenceRef,
        popoverRef,
        selectedText,
        selectionRect,
        isAddingVocab,
        addVocabError,
        handleSelectionEnd,
        addSelectionToVocabulary,
    } = useSelectionPopover({
        languageCode: selectedLanguage,
        contextSentence: currentSentence,
    });

    const { playing, playAudio } = useAudioTTS();

    const handleManualDifficultyAdjust = async (level: number) => {
        try {
            const res = await fetch('/api/difficulty', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level }),
            });
            if (res.ok) {
                setDifficultyLevelState(level);
            }
        } catch (err) {
            console.error('Failed to adjust difficulty', err);
        }
    };

    const handlePlacementComplete = (level: number) => {
        setPlacementCompleted(true);
        setDifficultyLevelState(level);
    };

    const handlePlacementSkip = async () => {
        setPlacementCompleted(true);
        setDifficultyLevelState(1);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {!profileLoading && !userProfile?.isOnboarded && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Profile Required</p>
                        <h2 className="text-xl font-bold text-gray-900 mt-2">Complete your learning profile</h2>
                        <p className="text-sm text-gray-500 mt-2">Finish setup on the home page to start lessons.</p>
                        <Link
                            href="/"
                            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        >
                            Go to home
                        </Link>
                    </div>
                </div>
            )}

            {/* Placement Test Modal */}
            {!profileLoading && !placementLoading && userProfile?.isOnboarded && !placementCompleted && (
                <PlacementTest
                    languageCode={selectedLanguage}
                    onComplete={handlePlacementComplete}
                    onSkip={handlePlacementSkip}
                />
            )}

            {/* Sidebar Component */}
            <MasteredSentencesSidebar
                sentences={selectedContext ? masteredSentences.filter(s => s.context === selectedContext) : []}
                onDelete={handleDeleteMasteredSentence}
                onSelect={(sentence) => {
                    const targetId = sentence.messageId;
                    if (targetId && messageRefs.current[targetId]) {
                        messageRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }

                    for (let i = messages.length - 1; i >= 0; i -= 1) {
                        const msg = messages[i];
                        if (msg.role === 'ai' && msg.content.includes(sentence.content)) {
                            messageRefs.current[msg.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            break;
                        }
                    }
                }}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Header */}
                <header className="sticky top-0 z-10 flex-shrink-0 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
                    <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back</span>
                        </Link>
                        <h1 className="text-lg font-bold text-blue-700">AI Tutor</h1>
                        <div className="flex items-center gap-3">
                            <DifficultyIndicator
                                level={difficultyLevel}
                                direction={difficultyDirection}
                                performance={difficultyPerformance}
                                onManualAdjust={handleManualDifficultyAdjust}
                            />
                            <LanguageSwitcher
                                selectedLanguage={selectedLanguage}
                                showLanguageMenu={showLanguageMenu}
                                setShowLanguageMenu={setShowLanguageMenu}
                                onSelectLanguage={(lang) => {
                                    setShowLanguageMenu(false);
                                    switchLanguage(lang);
                                }}
                            />
                            <ContextSwitcher
                                selectedContext={selectedContext}
                                showContextMenu={showContextMenu}
                                setShowContextMenu={setShowContextMenu}
                                onSelectContext={switchContext}
                            />
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <ChatArea
                    messages={messages}
                    loading={loading}
                    onSelectContext={switchContext}
                    messageRefs={messageRefs}
                    messagesEndRef={messagesEndRef}
                />

                {/* Control Area */}
                <div className="bg-white border-t border-gray-100 flex-shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="mx-auto w-full px-6 lg:px-12 py-4 flex flex-col gap-4 max-w-6xl">
                        {/* Current Sentence Display Area */}
                        <CurrentSentenceCard
                            currentSentence={currentSentence}
                            sentenceRef={sentenceRef}
                            popoverRef={popoverRef}
                            selectedText={selectedText}
                            selectionRect={selectionRect}
                            isAddingVocab={isAddingVocab}
                            addVocabError={addVocabError}
                            playing={playing}
                            onSelectionEnd={handleSelectionEnd}
                            onPlayAudio={playAudio}
                            onAddSelection={addSelectionToVocabulary}
                        />

                        <ControlButtons
                            loading={loading}
                            currentSentence={currentSentence}
                            onExplain={() => handleAction('explain')}
                            onTranslate={() => handleAction('translate')}
                            onUnderstand={() => handleAction('understand')}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}
