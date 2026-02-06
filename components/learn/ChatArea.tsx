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
                                    onClick={() => onSelectContext(ctx)}
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
                        ref={(el) => {
                            if (messageRefs.current) {
                                messageRefs.current[msg.id] = el;
                            }
                        }}
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
    );
}
