import { CheckCircle, HelpCircle, Languages } from 'lucide-react';

interface ControlButtonsProps {
    loading: boolean;
    cooldownActive: boolean;
    cooldownRemainingMs: number;
    hasQueuedAction: boolean;
    currentSentence: string;
    onExplain: () => void;
    onTranslate: () => void;
    onUnderstand: () => void;
}

export default function ControlButtons({
    loading,
    cooldownActive,
    cooldownRemainingMs,
    hasQueuedAction,
    currentSentence,
    onExplain,
    onTranslate,
    onUnderstand,
}: ControlButtonsProps) {
    const disabled = loading || cooldownActive || !currentSentence;
    const cooldownSeconds = (cooldownRemainingMs / 1000).toFixed(1);

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <button
                    onClick={onExplain}
                    disabled={disabled}
                    className="paper-action-tile"
                >
                    <HelpCircle size={22} className="text-[var(--accent-1)]" />
                    <span className="text-xs md:text-sm font-semibold">Explain</span>
                </button>

                <button
                    onClick={onTranslate}
                    disabled={disabled}
                    className="paper-action-tile"
                >
                    <Languages size={22} className="text-[var(--success)]" />
                    <span className="text-xs md:text-sm font-semibold">Translate</span>
                </button>

                <button
                    onClick={onUnderstand}
                    disabled={disabled}
                    className="paper-action-tile paper-action-tile-primary"
                >
                    <CheckCircle size={22} className="text-white/90" />
                    <span className="text-xs md:text-sm font-bold">Got it!</span>
                </button>
            </div>
            {cooldownActive && (
                <p className="text-xs text-[var(--ink-2)]">
                    You should learn carefully in {cooldownSeconds}s...
                    {hasQueuedAction ? ' Latest action queued.' : ''}
                </p>
            )}
        </div>
    );
}
