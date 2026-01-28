'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MasteredSentencesSidebar from '@/components/learn/MasteredSentencesSidebar';
import ChatArea from '@/components/learn/ChatArea';
import ContextSwitcher from '@/components/learn/ContextSwitcher';
import ControlButtons from '@/components/learn/ControlButtons';
import CurrentSentenceCard from '@/components/learn/CurrentSentenceCard';
import useAudioTTS from '@/hooks/learn/useAudioTTS';
import useLearnChat from '@/hooks/learn/useLearnChat';
import useSelectionPopover from '@/hooks/learn/useSelectionPopover';

export default function LearnPage() {
    const {
        messages,
        currentSentence,
        loading,
        selectedContext,
        showContextMenu,
        masteredSentences,
        userProfile,
        profileLoading,
        messagesEndRef,
        messageRefs,
        setShowContextMenu,
        handleAction,
        switchContext,
        handleDeleteMasteredSentence,
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
    } = useSelectionPopover();

    const { playing, playAudio } = useAudioTTS();

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
                <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10 flex-shrink-0">
                    <div className="max-w-3xl mx-auto flex items-center justify-between w-full">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back</span>
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900">AI Tutor</h1>
                        <ContextSwitcher
                            selectedContext={selectedContext}
                            showContextMenu={showContextMenu}
                            setShowContextMenu={setShowContextMenu}
                            onSelectContext={switchContext}
                        />
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
                <div className="bg-white border-t border-gray-200 p-4 pb-8 flex-shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="max-w-3xl mx-auto flex flex-col gap-4">
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
