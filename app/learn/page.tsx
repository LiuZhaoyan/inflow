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

export default function LearnPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentSentence, setCurrentSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
  const [masteredSentences, setMasteredSentences] = useState<MasteredSentence[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (!selectedContext) return;
        saveStoredChat(selectedContext, {
            messages,
            currentSentence,
            updatedAt: Date.now()
        });
    }, [messages, currentSentence, selectedContext]);

  useEffect(() => {
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
            }
        }
  }, []);

    const switchContext = (context: string) => {
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
    setLoading(true);

        if (action === 'init' && context) {
                setSelectedContext(context);
                localStorage.setItem('learn-chat:last-context', context);
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
                context
            })
        });

        if (!res.ok) throw new Error('API Error');
        
        const data = await res.json();
        
        setMessages(prev => [...prev, { 
            id: Date.now().toString() + 'ai', 
            role: 'ai', 
            content: data.response 
        }]);

        if (data.type === 'sentence') {
            setCurrentSentence(data.response);
            
            // If the user understood the previous sentence, add it to the sidebar
            if (action === 'understand' && sentenceInProgress) {
                setMasteredSentences(prev => [...prev, {
                    id: Date.now().toString(),
                    content: sentenceInProgress,
                    masteredAt: Date.now()
                }]);
            }

        } else if (data.original && data.type !== 'sentence') {
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
      
      {/* Sidebar Component */}
      <MasteredSentencesSidebar sentences={masteredSentences} />

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
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                            ctx === selectedContext
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
                    <div className="flex items-center justify-center gap-3">
                        <p className="text-lg md:text-xl font-medium text-gray-900 leading-normal">{currentSentence}</p>
                        <button 
                            onClick={() => playAudio(currentSentence)}
                            className={`p-2 rounded-full hover:bg-blue-100/50 text-blue-600 transition-all ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'}`}
                            title="Play pronunciation"
                        >
                            <Volume2 size={24} />
                        </button>
                    </div>
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
