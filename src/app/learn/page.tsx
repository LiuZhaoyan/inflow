'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRef, useState, type UIEvent } from 'react';
import MasteredSentencesSidebar from '@/components/learn/MasteredSentencesSidebar';
import ChatArea from '@/components/learn/ChatArea';
import ContextSwitcher from '@/components/learn/ContextSwitcher';
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
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const lastScrollTopRef = useRef(0);

    const {
        messages,
        currentSentence,
        loading,
        feedbackLoading,
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
        isUnderstandCooldownActive,
        cooldownUnderstandRemainingMs,
        hasQueuedUnderstand,
        isAuxCooldownActive,
        cooldownAuxRemainingMs,
        hasQueuedAux,
        placementCompleted,
        placementLoading,
        setPlacementCompleted,
        setDifficultyLevel: setDifficultyLevelState,
        setShowContextMenu,
        handleAction,
        switchContext,
        handleDeleteMasteredSentence,
        handleFeedback,
    } = useLearnChat();

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

    const handleWorkspaceScroll = (event: UIEvent<HTMLDivElement>) => {
        const scrollTop = event.currentTarget.scrollTop;

        if (scrollTop <= 8) {
            setIsHeaderHidden(false);
        } else if (scrollTop > lastScrollTopRef.current && scrollTop > 52) {
            setIsHeaderHidden(true);
        }

        lastScrollTopRef.current = scrollTop;
    };

    return (
        <div className="page-surface page-surface-reading flex h-screen w-full min-w-0 overflow-hidden text-[var(--foreground)]">
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
            <div className="relative flex h-full w-0 min-w-0 flex-1 flex-col bg-[var(--learn-canvas)]">
                <div
                    className="flex h-full flex-col overflow-x-hidden overflow-y-auto scroll-smooth"
                    onScroll={handleWorkspaceScroll}
                    onMouseMove={(event) => {
                        if (event.clientY <= 40) setIsHeaderHidden(false);
                    }}
                >
                    {/* Header */}
                    <header
                        className={`sticky top-0 z-30 w-full flex-shrink-0 border-b border-[var(--learn-line)] bg-white transition-transform duration-200 ${isHeaderHidden ? '-translate-y-full' : 'translate-y-0'}`}
                    >
                    <div className="mx-auto grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center px-4 py-2 sm:px-6 lg:px-12">
                        <Link
                            href="/profile"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--learn-line)] bg-[rgba(251,247,251,0.54)] text-[var(--ink-1)] transition-colors hover:text-[var(--accent-1)]"
                            title="Back to profile"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="justify-self-center">
                            <h1 className="sr-only">Learn</h1>
                            <ContextSwitcher
                                selectedContext={selectedContext}
                                showContextMenu={showContextMenu}
                                setShowContextMenu={setShowContextMenu}
                                onSelectContext={switchContext}
                                variant="header"
                            />
                        </div>
                        <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
                            <DifficultyIndicator
                                level={difficultyLevel}
                                direction={difficultyDirection}
                                performance={difficultyPerformance}
                                onManualAdjust={handleManualDifficultyAdjust}
                                compact
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
                </div>

                {/* Control Area */}
                <div className="paper-panel-flat absolute inset-x-0 bottom-0 z-20 bg-[var(--learn-canvas)] rounded-none">
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
                            feedbackLoading={feedbackLoading}
                            onSelectionEnd={handleSelectionEnd}
                            onPlayAudio={playAudio}
                            onAddSelection={addSelectionToVocabulary}
                            onFeedback={handleFeedback}
                        />

                        <ControlButtons
                            loading={loading}
                            understandCooldownActive={isUnderstandCooldownActive}
                            understandCooldownRemainingMs={cooldownUnderstandRemainingMs}
                            hasQueuedUnderstand={hasQueuedUnderstand}
                            auxCooldownActive={isAuxCooldownActive}
                            auxCooldownRemainingMs={cooldownAuxRemainingMs}
                            hasQueuedAux={hasQueuedAux}
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
