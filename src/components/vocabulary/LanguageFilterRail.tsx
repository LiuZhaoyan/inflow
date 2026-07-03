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
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      <button
        onClick={() => onSelect('all')}
        className={`bg-white border border-[var(--line-0)] shadow-sm rounded-r-full px-3 py-2 text-sm text-[var(--ink-2)] cursor-pointer hover:text-[var(--accent-1)] hover:border-[var(--line-1)] ${
          selectedLanguage === 'all' ? 'text-[var(--accent-1)] border-[var(--line-1)]' : ''
        }`}
        title="All"
      >
        <span className="inline-flex items-center gap-1">All</span>
      </button>
      {availableLanguages.map((code) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          className={`bg-white border border-[var(--line-0)] shadow-sm rounded-r-full px-3 py-2 text-sm text-[var(--ink-2)] cursor-pointer hover:text-[var(--accent-1)] hover:border-[var(--line-1)] ${
            selectedLanguage === code ? 'text-[var(--accent-1)] border-[var(--line-1)]' : ''
          }`}
          title={resolveLanguageLabel(code)}
        >
          <span className="inline-flex items-center gap-1">{resolveLanguageLabel(code)}</span>
        </button>
      ))}
    </div>
  );
}
