import { CheckCircle, HelpCircle, Languages } from 'lucide-react';

interface ControlButtonsProps {
    loading: boolean;
    currentSentence: string;
    onExplain: () => void;
    onTranslate: () => void;
    onUnderstand: () => void;
}

export default function ControlButtons({
    loading,
    currentSentence,
    onExplain,
    onTranslate,
    onUnderstand,
}: ControlButtonsProps) {
    return (
        <div className="grid grid-cols-3 gap-3 md:gap-4">
            <button
                onClick={onExplain}
                disabled={loading || !currentSentence}
                className="paper-action-tile"
            >
                <HelpCircle size={22} className="text-[var(--accent-1)]" />
                <span className="text-xs md:text-sm font-semibold">Explain</span>
            </button>

            <button
                onClick={onTranslate}
                disabled={loading || !currentSentence}
                className="paper-action-tile"
            >
                <Languages size={22} className="text-[var(--success)]" />
                <span className="text-xs md:text-sm font-semibold">Translate</span>
            </button>

            <button
                onClick={onUnderstand}
                disabled={loading || !currentSentence}
                className="paper-action-tile paper-action-tile-primary"
            >
                <CheckCircle size={22} className="text-white/90" />
                <span className="text-xs md:text-sm font-bold">Got it!</span>
            </button>
        </div>
    );
}
