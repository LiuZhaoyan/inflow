import { LANGUAGE_OPTIONS, resolveLanguageLabel, type LanguageCode } from '@/lib/language';

interface LanguageSwitcherProps {
    selectedLanguage: LanguageCode;
    showLanguageMenu: boolean;
    setShowLanguageMenu: (value: boolean | ((prev: boolean) => boolean)) => void;
    onSelectLanguage: (language: LanguageCode) => void;
}

export default function LanguageSwitcher({
    selectedLanguage,
    showLanguageMenu,
    setShowLanguageMenu,
    onSelectLanguage,
}: LanguageSwitcherProps) {
    return (
        <div className="min-w-[120px] flex justify-end relative">
            <button
                onClick={() => setShowLanguageMenu(prev => !prev)}
                className="text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                title="Switch language"
            >
                {resolveLanguageLabel(selectedLanguage)}
            </button>

            {showLanguageMenu && (
                <div className="absolute right-0 top-9 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20">
                    <div className="text-xs text-gray-400 px-2 py-1">Switch language</div>
                    <div className="max-h-64 overflow-auto">
                        {LANGUAGE_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                onClick={() => onSelectLanguage(option.value)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${option.value === selectedLanguage
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
