import { CONTEXT_OPTIONS } from '@/lib/types/learnTypes';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ContextSwitcherProps {
    selectedContext: string | null;
    showContextMenu: boolean;
    setShowContextMenu: (value: boolean | ((prev: boolean) => boolean)) => void;
    onSelectContext: (context: string) => void;
    variant?: 'header';
}

export default function ContextSwitcher({
    selectedContext,
    showContextMenu,
    setShowContextMenu,
    onSelectContext,
    variant,
}: ContextSwitcherProps) {
    const menuRef = useClickOutsideClose(showContextMenu, () => setShowContextMenu(false));
    const isHeader = variant === 'header';
    const contextLabel = selectedContext ?? 'Choose a context';

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setShowContextMenu(prev => !prev)}
                className={isHeader
                    ? 'flex max-w-[13rem] flex-col items-center text-center sm:max-w-md'
                    : selectedContext
                        ? 'paper-pill-soft paper-pill-accent cursor-pointer px-2.5 py-1 text-xs font-semibold md:text-sm'
                        : 'paper-pill-soft paper-pill-ink cursor-pointer px-2.5 py-1 text-xs font-semibold md:text-sm'}
                title={selectedContext ? 'Switch context' : 'Choose context'}
                aria-expanded={showContextMenu}
            >
                {isHeader ? (
                    <>
                        <span className="flex max-w-full items-center gap-1 truncate font-serif text-lg font-bold text-[var(--ink-0)] sm:text-2xl">
                            <span className="truncate">{contextLabel}</span>
                            {showContextMenu ? <ChevronUp size={16} className="flex-shrink-0 text-[var(--accent-1)]" /> : <ChevronDown size={16} className="flex-shrink-0 text-[var(--accent-1)]" />}
                        </span>
                        <span className="mt-0.5 text-[10px] font-extrabold tracking-[0.09em] text-[var(--accent-1)]">LEARNING</span>
                    </>
                ) : (
                    selectedContext ?? 'Choose'
                )}
            </button>

            {showContextMenu && (
                <div className={isHeader
                    ? 'absolute left-1/2 top-[calc(100%+10px)] z-30 w-[min(18rem,calc(100vw-4rem))] -translate-x-1/2 rounded-md border border-[rgba(122,85,133,0.25)] bg-[#fbf7fb] p-2 shadow-[0_15px_28px_rgba(62,40,69,0.18)]'
                    : 'paper-popover absolute right-0 top-9 z-20 w-56 p-2'}>
                    {!isHeader && <div className="px-2 py-1 text-xs text-[var(--ink-3)]">Switch context</div>}
                    <div className="max-h-64 overflow-auto">
                        {CONTEXT_OPTIONS.map(ctx => (
                            <button
                                key={ctx}
                                type="button"
                                onClick={() => {
                                    onSelectContext(ctx);
                                    setShowContextMenu(false);
                                }}
                                className={`flex w-full cursor-pointer items-center justify-between rounded-[3px] px-3 py-2 text-left text-sm font-semibold transition-colors ${ctx === selectedContext
                                        ? 'bg-[#f0e4f0] text-[var(--accent-1)]'
                                        : 'text-[var(--ink-1)] hover:bg-[var(--paper-1)]'
                                    }`}
                            >
                                {ctx}
                                {ctx === selectedContext && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
