import { CONTEXT_OPTIONS } from '@/lib/types/learnTypes';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';

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
    const menuRef = useClickOutsideClose(showContextMenu, () => setShowContextMenu(false));

    return (
        <div className="relative" ref={menuRef}>
            {selectedContext ? (
                <button
                    onClick={() => setShowContextMenu(prev => !prev)}
                    className="paper-pill-soft paper-pill-accent cursor-pointer text-xs md:text-sm font-semibold px-2.5 py-1"
                    title="Switch context"
                >
                    {selectedContext}
                </button>
            ) : (
                <button
                    onClick={() => setShowContextMenu(true)}
                    className="paper-pill-soft paper-pill-ink cursor-pointer text-xs md:text-sm font-semibold px-2.5 py-1"
                    title="Choose context"
                >
                    Choose
                </button>
            )}

            {showContextMenu && (
                <div className="paper-popover absolute right-0 top-9 w-56 p-2 z-20">
                    <div className="text-xs text-[var(--ink-3)] px-2 py-1">Switch context</div>
                    <div className="max-h-64 overflow-auto">
                        {CONTEXT_OPTIONS.map(ctx => (
                            <button
                                key={ctx}
                                onClick={() => onSelectContext(ctx)}
                                className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ctx === selectedContext
                                        ? 'bg-[rgba(147,51,234,0.1)] text-[var(--accent-1)]'
                                        : 'text-[var(--ink-1)] hover:bg-[var(--paper-1)]'
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
