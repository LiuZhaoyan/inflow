'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Languages, CheckCircle, HelpCircle, Volume2 } from 'lucide-react';
import MasteredSentencesSidebar, { MasteredSentence } from '@/components/MasteredSentencesSidebar';

const CONTEXT_OPTIONS = [
    "Daily Conversation",
    "Travel & Airport",
    "Restaurant & Food",
    "Shopping",
    "Business",
    "Emergency"
];

interface Msg {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

interface StoredChat {
    messages: Msg[];
    currentSentence: string;
    updatedAt: number;
}

interface UserProfile {
    username: string;
    nativeLanguage: string;
    targetLanguage: string;
    isOnboarded?: boolean;
}

export default function LearnPage() {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [currentSentence, setCurrentSentence] = useState('');
    const [currentSentenceMessageId, setCurrentSentenceMessageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [masteredSentences, setMasteredSentences] = useState<MasteredSentence[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sentenceRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRect, setSelectionRect] = useState<{ top: number; left: number } | null>(null);
    const [isAddingVocab, setIsAddingVocab] = useState(false);
    const [addVocabError, setAddVocabError] = useState<string | null>(null);

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const getStorageKey = (context: string) => `learn-chat:${context}`;

    const loadStoredChat = (context: string) => {
        try {
            const raw = localStorage.getItem(getStorageKey(context));
            if (!raw) return null;
            return JSON.parse(raw) as StoredChat;
        } catch (err) {
            console.error('Failed to load stored chat', err);
            return null;
        }
    };

    const saveStoredChat = (context: string, data: StoredChat) => {
        try {
            localStorage.setItem(getStorageKey(context), JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save stored chat', err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sanitizeSelection = (text: string) => {
        const cleaned = text
            .replace(/[\n\r]+/g, ' ')
            .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '')
            .trim();
        return cleaned;
    };

    const clearSelectionUI = () => {
        setSelectedText('');
        setSelectionRect(null);
        setAddVocabError(null);
    };

    const handleSelectionEnd = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            clearSelectionUI();
            return;
        }

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range) {
            clearSelectionUI();
            return;
        }

        const container = sentenceRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
            clearSelectionUI();
            return;
        }

        const text = sanitizeSelection(selection.toString());
        if (!text) {
            clearSelectionUI();
            return;
        }

        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionRect({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    };

    const addSelectionToVocabulary = async () => {
        if (!selectedText || isAddingVocab) return;
        setIsAddingVocab(true);
        setAddVocabError(null);

        try {
            const res = await fetch('/api/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: selectedText }),
            });

            if (!res.ok) {
                throw new Error('Failed to add word');
            }

            clearSelectionUI();
            const selection = window.getSelection();
            selection?.removeAllRanges();
        } catch (err) {
            console.error(err);
            setAddVocabError('Failed to add word');
        } finally {
            setIsAddingVocab(false);
        }
    };

    const playAudio = async (text: string) => {
        if (!text || playing) return;
        setPlaying(true);
        try {
            const res = await fetch('/api/ai-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, stream: true })
            });
            if (!res.ok) throw new Error('TTS failed');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                setPlaying(false);
                URL.revokeObjectURL(url);
            };
            await audio.play();
        } catch (e) {
            console.error(e);
            setPlaying(false);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!sentenceRef.current) return;
            if (popoverRef.current?.contains(event.target as Node)) return;
            if (!sentenceRef.current.contains(event.target as Node)) {
                clearSelectionUI();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!selectedContext) return;
        saveStoredChat(selectedContext, {
            messages,
            currentSentence,
            updatedAt: Date.now()
        });
    }, [messages, currentSentence, selectedContext]);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/user');
                if (res.ok) {
                    const data = await res.json();
                    const profile = data?.profile as UserProfile | undefined;
                    if (profile) {
                        setUserProfile(profile);
                    } else {
                        setUserProfile(null);
                    }
                } else {
                    setUserProfile(null);
                }
            } catch (err) {
                console.error('Failed to load user profile', err);
                setUserProfile(null);
            } finally {
                setProfileLoading(false);
            }
        };

        init();

        // 1. Fetch Mastered Sentences
        fetch('/api/mastered-sentences')
            .then(res => res.json())
            .then(data => {
                if (data.sentences) setMasteredSentences(data.sentences);
            })
            .catch(err => console.error("Failed to load history", err));

        const lastContext = localStorage.getItem('learn-chat:last-context');
        if (lastContext) {
            setSelectedContext(lastContext);
            const stored = loadStoredChat(lastContext);
            if (stored) {
                setMessages(stored.messages);
                setCurrentSentence(stored.currentSentence);
                setCurrentSentenceMessageId(null);
            }
        }
    }, []);

    const handleDeleteMasteredSentence = async (id: string) => {
        const previous = masteredSentences;
        setMasteredSentences(prev => prev.filter(s => s.id !== id));

        try {
            const res = await fetch('/api/mastered-sentences', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!res.ok) throw new Error('Delete failed');
            const data = await res.json();
            if (data.sentences) setMasteredSentences(data.sentences);
        } catch (error) {
            console.error(error);
            setMasteredSentences(previous);
        }
    };

    const switchContext = (context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        setSelectedContext(context);
        setShowContextMenu(false);
        localStorage.setItem('learn-chat:last-context', context);
        const stored = loadStoredChat(context);
        if (stored) {
            setMessages(stored.messages);
            setCurrentSentence(stored.currentSentence);
            return;
        }
        setMessages([]);
        setCurrentSentence('');
        handleAction('init', context);
    };

    const handleAction = async (action: 'init' | 'explain' | 'translate' | 'understand', context?: string) => {
        if (loading) return;
        if (!userProfile?.isOnboarded) {
            return;
        }
        setLoading(true);

        const effectiveContext = context ?? selectedContext ?? undefined;

        if (action === 'init' && effectiveContext) {
            setSelectedContext(effectiveContext);
            localStorage.setItem('learn-chat:last-context', effectiveContext);
        }

        // Capture the sentence being acted upon BEFORE it potentially changes
        const sentenceInProgress = currentSentence;

        // Optimistic update for user actions (not init)
        if (action !== 'init') {
            let text = '';
            if (action === 'explain') text = 'Explain please';
            if (action === 'translate') text = 'Translate please';
            if (action === 'understand') text = 'I got it!';

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
        }

        try {
            const res = await fetch('/api/learn-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    currentSentence: sentenceInProgress,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    context: effectiveContext,
                    messageId: currentSentenceMessageId
                })
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();

            const aiMessageId = Date.now().toString() + 'ai';
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: data.response
            }]);

            const normalizedType = typeof data.type === 'string' ? data.type.toLowerCase() : '';

            if (normalizedType === 'sentence' || action === 'init' || action === 'understand') {
                if (typeof data.response === 'string' && data.response.trim()) {
                    setCurrentSentence(data.response);
                    setCurrentSentenceMessageId(aiMessageId);
                }

                // If the user understood the previous sentence, add it to the sidebar
                if (action === 'understand' && sentenceInProgress) {
                    setMasteredSentences(prev => [...prev, {
                        id: Date.now().toString(),
                        content: sentenceInProgress,
                        masteredAt: Date.now(),
                        context: effectiveContext ?? undefined,
                        messageId: currentSentenceMessageId ?? undefined
                    }]);
                }

            } else if (data.original && normalizedType !== 'sentence') {
                // Ensure we keep the original sentence if the user just asked for explanation
                setCurrentSentence(data.original);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + 'err',
                role: 'ai',
                content: "Sorry, I encountered an error. Please try again."
            }]);
        } finally {
            setLoading(false);
        }
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
                        <div className="min-w-[120px] flex justify-end relative">
                            {selectedContext ? (
                                <button
                                    onClick={() => setShowContextMenu(prev => !prev)}
                                    className="text-xs md:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
                                    title="Switch context"
                                >
                                    {selectedContext}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowContextMenu(true)}
                                    className="text-xs md:text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
                                    title="Choose context"
                                >
                                    Choose
                                </button>
                            )}

                            {showContextMenu && (
                                <div className="absolute right-0 top-9 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20">
                                    <div className="text-xs text-gray-400 px-2 py-1">Switch context</div>
                                    <div className="max-h-64 overflow-auto">
                                        {CONTEXT_OPTIONS.map(ctx => (
                                            <button
                                                key={ctx}
                                                onClick={() => switchContext(ctx)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ctx === selectedContext
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {ctx}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-6 pb-4">
                        {(messages.length === 0 && !loading) && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold text-gray-800">Choose a Context</h2>
                                    <p className="text-gray-500">Select a topic to start your personalized lesson.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                                    {CONTEXT_OPTIONS.map(ctx => (
                                        <button
                                            key={ctx}
                                            onClick={() => switchContext(ctx)}
                                            className="p-4 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm text-left flex items-center justify-between group"
                                        >
                                            <span className="font-medium text-gray-700 group-hover:text-blue-700">{ctx}</span>
                                            <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                ref={(el) => { messageRefs.current[msg.id] = el; }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                            max-w-[85%] rounded-2xl px-6 py-4 text-base md:text-lg leading-relaxed shadow-sm
                            ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}
                        `}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm">
                                    <div className="flex gap-2">
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </main>

                {/* Control Area */}
                <div className="bg-white border-t border-gray-200 p-4 pb-8 flex-shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="max-w-3xl mx-auto flex flex-col gap-4">
                        {/* Current Sentence Display Area */}
                        {currentSentence ? (
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-5 text-center shadow-inner relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1 block">Current Challenge</span>
                                <div
                                    ref={sentenceRef}
                                    onMouseUp={handleSelectionEnd}
                                    onTouchEnd={handleSelectionEnd}
                                    className="flex items-center justify-center gap-3"
                                >
                                    <p className="text-lg md:text-xl font-medium text-gray-900 leading-normal">{currentSentence}</p>
                                    <button
                                        onClick={() => playAudio(currentSentence)}
                                        className={`p-2 rounded-full hover:bg-blue-100/50 text-blue-600 transition-all ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'}`}
                                        title="Play pronunciation"
                                    >
                                        <Volume2 size={24} />
                                    </button>
                                </div>
                                {selectionRect && selectedText && (
                                    <div
                                        ref={popoverRef}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onTouchStart={(event) => event.stopPropagation()}
                                        className="fixed z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg"
                                        style={{ top: selectionRect.top, left: selectionRect.left }}
                                    >
                                        <div className="text-xs text-gray-500 mb-1">Selected</div>
                                        <div className="text-sm font-semibold text-gray-900 mb-2">{selectedText}</div>
                                        <button
                                            onClick={addSelectionToVocabulary}
                                            disabled={isAddingVocab}
                                            className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            {isAddingVocab ? 'Adding...' : 'Add to Vocabulary'}
                                        </button>
                                        {addVocabError && (
                                            <div className="mt-1 text-[10px] text-red-500">{addVocabError}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-gray-400 italic py-4">Waiting for your coach...</div>
                        )}

                        <div className="grid grid-cols-3 gap-3 md:gap-4">
                            <button
                                onClick={() => handleAction('explain')}
                                disabled={loading || !currentSentence}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-gray-100 hover:border-gray-200"
                            >
                                <HelpCircle size={22} className="text-indigo-500" />
                                <span className="text-xs md:text-sm font-semibold">Explain</span>
                            </button>

                            <button
                                onClick={() => handleAction('translate')}
                                disabled={loading || !currentSentence}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-gray-100 hover:border-gray-200"
                            >
                                <Languages size={22} className="text-blue-500" />
                                <span className="text-xs md:text-sm font-semibold">Translate</span>
                            </button>

                            <button
                                onClick={() => handleAction('understand')}
                                disabled={loading || !currentSentence}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                <CheckCircle size={22} className="text-white/90" />
                                <span className="text-xs md:text-sm font-bold">Got it!</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
