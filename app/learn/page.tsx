'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import MasteredSentencesSidebar from '@/components/learn/MasteredSentencesSidebar';
import ChatArea from '@/components/learn/ChatArea';
import ContextSwitcher from '@/components/learn/ContextSwitcher';
import LanguageSwitcher from '@/components/learn/LanguageSwitcher';
import ControlButtons from '@/components/learn/ControlButtons';
import CurrentSentenceCard from '@/components/learn/CurrentSentenceCard';
import DifficultyIndicator from '@/components/learn/DifficultyIndicator';
import PlacementTest from '@/components/learn/PlacementTest';
import UserMenu from '@/components/auth/UserMenu';
import ProfileAvatarLink from '@/components/auth/ProfileAvatarLink';
import useAudioTTS from '@/hooks/learn/useAudioTTS';
import useLearnChat from '@/hooks/learn/useLearnChat';
import useSelectionPopover from '@/hooks/learn/useSelectionPopover';

export default function LearnPage() {
    const { data: session } = useSession();

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
        isCooldownActive,
        cooldownRemainingMs,
        hasQueuedAction,
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
        <div className="page-surface page-surface-reading flex h-screen overflow-hidden text-[var(--foreground)]">
            {!profileLoading && !userProfile?.isOnboarded && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="paper-panel-flat w-full max-w-md mx-4 p-6 text-center">
                        <p className="paper-chip justify-center text-[var(--accent-1)]">Profile Required</p>
                        <h2 className="paper-title text-2xl mt-2">Complete your learning profile</h2>
                        <p className="paper-subtitle text-sm mt-2 mx-auto">Finish setup on the home page to start lessons.</p>
                        <Link
                            href="/"
                            className="paper-btn-primary mt-4 inline-flex"
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
                <header className="sticky top-0 z-10 flex-shrink-0 w-full bg-[rgba(255,250,241,0.86)] backdrop-blur-md">
                    <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
                        <Link href="/profile" className="paper-btn-flat min-h-0 px-3 py-2 text-sm">
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back</span>
                        </Link>
                        <h1 className="paper-title text-lg text-[var(--accent-1)]">AI Tutor</h1>
                        <div className="flex items-center gap-3">
                            <DifficultyIndicator
                                level={difficultyLevel}
                                direction={difficultyDirection}
                                performance={difficultyPerformance}
                                onManualAdjust={handleManualDifficultyAdjust}
                            />
                            {/* <LanguageSwitcher
                                selectedLanguage={selectedLanguage}
                                showLanguageMenu={showLanguageMenu}
                                setShowLanguageMenu={setShowLanguageMenu}
                                onSelectLanguage={(lang) => {
                                    setShowLanguageMenu(false);
                                    switchLanguage(lang);
                                }}
                            /> */}
                            <ContextSwitcher
                                selectedContext={selectedContext}
                                showContextMenu={showContextMenu}
                                setShowContextMenu={setShowContextMenu}
                                onSelectContext={switchContext}
                            />
                            {session?.user ? (
                                <UserMenu name={session.user.name} email={session.user.email} />
                            ) : (
                                <ProfileAvatarLink />
                            )}
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
                <div className="paper-panel-flat bg-transparent flex-shrink-0 z-20 rounded-none">
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
                            cooldownActive={isCooldownActive}
                            cooldownRemainingMs={cooldownRemainingMs}
                            hasQueuedAction={hasQueuedAction}
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
