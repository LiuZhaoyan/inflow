import { CheckCircle, HelpCircle, Languages } from 'lucide-react';

interface ControlButtonsProps {
    loading: boolean;
    understandCooldownActive: boolean;
    understandCooldownRemainingMs: number;
    hasQueuedUnderstand: boolean;
    auxCooldownActive: boolean;
    auxCooldownRemainingMs: number;
    hasQueuedAux: boolean;
    currentSentence: string;
    onExplain: () => void;
    onTranslate: () => void;
    onUnderstand: () => void;
}

export default function ControlButtons({
    loading,
    understandCooldownActive,
    understandCooldownRemainingMs,
    hasQueuedUnderstand,
    auxCooldownActive,
    auxCooldownRemainingMs,
    hasQueuedAux,
    currentSentence,
    onExplain,
    onTranslate,
    onUnderstand,
}: ControlButtonsProps) {
    const understandCooldownSeconds = (understandCooldownRemainingMs / 1000).toFixed(1);
    const auxCooldownSeconds = (auxCooldownRemainingMs / 1000).toFixed(1);

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <button
                    onClick={onExplain}
                    disabled={loading || auxCooldownActive || !currentSentence}
                    className="paper-action-tile"
                >
                    <HelpCircle size={22} className="text-[var(--accent-1)]" />
                    <span className="text-xs md:text-sm font-semibold">Explain</span>
                </button>

                <button
                    onClick={onTranslate}
                    disabled={loading || auxCooldownActive || !currentSentence}
                    className="paper-action-tile"
                >
                    <Languages size={22} className="text-[var(--success)]" />
                    <span className="text-xs md:text-sm font-semibold">Translate</span>
                </button>

                <button
                    onClick={onUnderstand}
                    disabled={loading || understandCooldownActive || !currentSentence}
                    className="paper-action-tile paper-action-tile-primary"
                >
                    <CheckCircle size={22} className="text-white/90" />
                    <span className="text-xs md:text-sm font-bold">Got it!</span>
                </button>
            </div>
            {auxCooldownActive && (
                <p className="text-xs text-[var(--ink-2)]">
                    Explain/Translate cooldown in {auxCooldownSeconds}s...
                    {hasQueuedAux ? ' Latest action queued.' : ''}
                </p>
            )}
            {understandCooldownActive && (
                <p className="text-xs text-[var(--ink-2)]">
                    Next sentence in {understandCooldownSeconds}s...
                    {hasQueuedUnderstand ? ' Latest action queued.' : ''}
                </p>
            )}
        </div>
    );
}
