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
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-gray-100 hover:border-gray-200"
            >
                <HelpCircle size={22} className="text-indigo-500" />
                <span className="text-xs md:text-sm font-semibold">Explain</span>
            </button>

            <button
                onClick={onTranslate}
                disabled={loading || !currentSentence}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-gray-100 hover:border-gray-200"
            >
                <Languages size={22} className="text-blue-500" />
                <span className="text-xs md:text-sm font-semibold">Translate</span>
            </button>

            <button
                onClick={onUnderstand}
                disabled={loading || !currentSentence}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
                <CheckCircle size={22} className="text-white/90" />
                <span className="text-xs md:text-sm font-bold">Got it!</span>
            </button>
        </div>
    );
}
