import { resolveLanguageLabel } from '@/lib/core/language';

interface LanguageFilterRailProps {
  availableLanguages: string[];
  selectedLanguage: string;
  onSelect: (value: string) => void;
}

export default function LanguageFilterRail({
  availableLanguages,
  selectedLanguage,
  onSelect,
}: LanguageFilterRailProps) {
  return (
    <div className="flex h-full gap-2">
      <button
        onClick={() => onSelect('all')}
        className={`flex h-[64px] w-10 items-center justify-center bg-white border border-[var(--line-0)] shadow-sm rounded-b-full px-1.5 py-2 text-sm text-[var(--ink-2)] cursor-pointer [writing-mode:vertical-rl] hover:text-[var(--accent-1)] hover:border-[var(--line-1)] ${
          selectedLanguage === 'all' ? 'text-[var(--accent-1)] border-[var(--line-1)]' : ''
        }`}
        title="All"
      >
        <span className="inline-flex items-center justify-center">All</span>
      </button>
      {availableLanguages.map((code) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          className={`flex h-[64px] w-10 items-center justify-center bg-white border border-[var(--line-0)] shadow-sm rounded-b-full px-1.5 py-2 text-sm text-[var(--ink-2)] cursor-pointer [writing-mode:vertical-rl] hover:text-[var(--accent-1)] hover:border-[var(--line-1)] ${
            selectedLanguage === code ? 'text-[var(--accent-1)] border-[var(--line-1)]' : ''
          }`}
          title={resolveLanguageLabel(code)}
        >
          <span className="inline-flex items-center justify-center">{resolveLanguageLabel(code)}</span>
        </button>
      ))}
    </div>
  );
}
