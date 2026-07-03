import { ArrowLeft } from 'lucide-react';
import type { RefObject } from 'react';
import type { Msg } from '@/lib/types/learnTypes';
import { CONTEXT_OPTIONS } from '@/lib/types/learnTypes';

interface ChatAreaProps {
    messages: Msg[];
    loading: boolean;
    onSelectContext: (context: string) => void;
    messageRefs: RefObject<Record<string, HTMLDivElement | null>>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatArea({
    messages,
    loading,
    onSelectContext,
    messageRefs,
    messagesEndRef,
}: ChatAreaProps) {
    return (
        <main className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
            <div className="max-w-5xl mx-auto space-y-6 pb-4">
                {(messages.length === 0 && !loading) && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        <div className="text-center space-y-2">
                            <h2 className="paper-title text-2xl">Choose a Context</h2>
                            <p className="paper-subtitle text-center">Select a topic to start your personalized lesson.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                            {CONTEXT_OPTIONS.map(ctx => (
                                <button
                                    key={ctx}
                                    onClick={() => onSelectContext(ctx)}
                                    className="paper-panel-soft p-4 text-left flex items-center justify-between group"
                                >
                                    <span className="font-medium text-[var(--ink-1)] group-hover:text-[var(--accent-1)]">{ctx}</span>
                                    <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-1)]" size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        ref={(el) => {
                            if (messageRefs.current) {
                                messageRefs.current[msg.id] = el;
                            }
                        }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`
                            max-w-[85%] rounded-2xl px-6 py-4 text-base md:text-lg leading-relaxed
                            ${msg.role === 'user'
                                    ? 'bg-[var(--accent-0)] text-[#fff9f3] rounded-tr-none'
                                    : 'paper-panel-soft text-[var(--ink-1)] rounded-tl-none'}
                        `}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="paper-panel-soft rounded-2xl rounded-tl-none px-6 py-4">
                            <div className="flex gap-2">
                                <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </main>
    );
}
