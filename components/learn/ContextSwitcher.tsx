import { CONTEXT_OPTIONS } from '@/lib/learnTypes';

interface ContextSwitcherProps {
    selectedContext: string | null;
    showContextMenu: boolean;
    setShowContextMenu: (value: boolean | ((prev: boolean) => boolean)) => void;
    onSelectContext: (context: string) => void;
}

export default function ContextSwitcher({
    selectedContext,
    showContextMenu,
    setShowContextMenu,
    onSelectContext,
}: ContextSwitcherProps) {
    return (
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
                                onClick={() => onSelectContext(ctx)}
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
    );
}
