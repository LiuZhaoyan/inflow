'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Languages, CheckCircle, HelpCircle, Volume2 } from 'lucide-react';
import MasteredSentencesSidebar, { MasteredSentence } from '@/components/MasteredSentencesSidebar';

interface Msg {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function LearnPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentSentence, setCurrentSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [masteredSentences, setMasteredSentences] = useState<MasteredSentence[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            body: JSON.stringify({ text })
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
    // 1. Fetch Mastered Sentences
    fetch('/api/mastered-sentences')
      .then(res => res.json())
      .then(data => {
        if (data.sentences) setMasteredSentences(data.sentences);
      })
      .catch(err => console.error("Failed to load history", err));

    // 2. Init session with a fixed sentence (Local start)
    setMessages([{ 
        id: 'init-ai', 
        role: 'ai', 
        content: "Welcome! Let's start with a basic Korean greeting." 
    }]);
    setCurrentSentence("안녕하세요, 반갑습니다.");
  }, []);

  const handleAction = async (action: 'init' | 'explain' | 'translate' | 'understand') => {
    if (loading) return;
    setLoading(true);

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
                history: messages.map(m => ({ role: m.role, content: m.content }))
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
                <div className="w-8" /> 
            </div>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
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
