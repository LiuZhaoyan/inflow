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
    const noteTypes = {
        sentence: { label: 'Sentence', labelClass: 'text-[var(--accent-1)]', bodyClass: 'font-serif text-lg' },
        explanation: { label: 'Explanation', labelClass: 'text-[var(--accent-1)]', bodyClass: '' },
        translation: { label: 'Translation', labelClass: 'text-[var(--sage-0)]', bodyClass: '' },
    } as const;
    const visibleMessages = messages.filter((msg) => !(msg.role === 'user' && msg.userAction));

    return (
        <main className="flex-1 overflow-y-auto bg-[var(--learn-canvas)] px-4 py-5 scroll-smooth sm:px-6 sm:py-6">
            <div className="relative mx-auto w-full max-w-3xl py-3 pl-10 pr-1 sm:pl-12 sm:pr-2">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-5 left-2 right-0 rounded-[5px] bg-[#d4c7d4] shadow-[0_11px_20px_rgba(62,40,69,0.16),0_2px_0_rgba(82,59,88,0.22)]"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(91, 70, 100, 0.05) 0, rgba(91, 70, 100, 0.05) 1px, transparent 1px, transparent 5px)' }}
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-12 left-3 z-20 flex flex-col justify-between sm:left-[18px]">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <span
                            key={index}
                            className="block h-4 w-5 rounded-l-xl rounded-r-[3px] border-2 border-[#a18d83] border-r-[#635750] bg-[rgba(246,241,234,0.8)] shadow-[1px_2px_1px_rgba(62,48,42,0.2)] sm:h-5 sm:w-6 sm:border-[3px]"
                        />
                    ))}
                </div>
                <section
                    className="relative z-10 min-h-full w-full min-w-0 rounded-[4px] border border-[rgba(134,88,151,0.18)] bg-[#fbf7fb] px-5 py-7 shadow-[0_2px_0_rgba(95,72,101,0.16)] sm:px-9 sm:py-9"
                    style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 17px, rgba(134, 88, 151, 0.12) 17px, rgba(134, 88, 151, 0.12) 18px)' }}
                >
                    {(visibleMessages.length === 0 && !loading) && (
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
                                        className="group flex items-center justify-between rounded-xl border border-[var(--learn-line)] bg-[var(--learn-note)] p-4 text-left"
                                    >
                                        <span className="font-medium text-[var(--ink-1)] group-hover:text-[var(--accent-1)]">{ctx}</span>
                                        <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-1)]" size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {(visibleMessages.length > 0 || loading) && (
                        <div className="space-y-0">
                            {visibleMessages.map((msg, index) => {
                                const note = msg.messageType === 'sentence'
                                    ? noteTypes.sentence
                                    : msg.messageType === 'explanation'
                                        ? noteTypes.explanation
                                        : msg.messageType === 'translation'
                                            ? noteTypes.translation
                                            : undefined;

                                return (
                                    <div
                                        key={msg.id}
                                        ref={(el) => {
                                            if (messageRefs.current) {
                                                messageRefs.current[msg.id] = el;
                                            }
                                        }}
                                        className={`flex py-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${index > 0 ? 'border-t-2 border-dashed border-[rgba(126,34,206,0.28)]' : ''}`}
                                    >
                                        <div className={msg.role === 'user' ? 'max-w-[80%]' : 'w-full max-w-[42rem]'}>
                                            {msg.role === 'ai' && note && (
                                                <div className={`mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] ${note.labelClass}`}>
                                                    {note.label}
                                                </div>
                                            )}
                                            <div className={`
                                                text-base leading-relaxed md:text-lg
                                                ${msg.role === 'user'
                                                        ? 'font-medium text-[var(--accent-1)]'
                                                        : `${note?.bodyClass ?? ''} text-[var(--ink-1)]`}
                                            `}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {loading && (
                                <div className={`flex justify-start py-5 ${visibleMessages.length > 0 ? 'border-t-2 border-dashed border-[rgba(126,34,206,0.28)]' : ''}`}>
                                    <div className="flex gap-2">
                                        <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </section>
            </div>
        </main>
    );
}
