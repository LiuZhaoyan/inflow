import { LANGUAGE_OPTIONS, resolveLanguageLabel, type LanguageCode } from '@/lib/language';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';

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
    const menuRef = useClickOutsideClose(showLanguageMenu, () => setShowLanguageMenu(false));

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowLanguageMenu(prev => !prev)}
                className="paper-pill-soft paper-pill-success cursor-pointer text-xs md:text-sm font-semibold px-2.5 py-1"
                title="Switch language"
            >
                {resolveLanguageLabel(selectedLanguage)}
            </button>

            {showLanguageMenu && (
                <div className="paper-popover absolute right-0 top-9 w-56 p-2 z-20">
                    <div className="text-xs text-[var(--ink-3)] px-2 py-1">Switch language</div>
                    <div className="max-h-64 overflow-auto">
                        {LANGUAGE_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                onClick={() => onSelectLanguage(option.value)}
                                className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${option.value === selectedLanguage
                                        ? 'bg-[rgba(95,125,98,0.12)] text-[var(--success)]'
                                        : 'text-[var(--ink-1)] hover:bg-[var(--paper-1)]'
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
