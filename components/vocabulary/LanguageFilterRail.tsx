import { resolveLanguageLabel } from '@/lib/language';

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
        className={`bg-white border border-gray-200 shadow-sm rounded-r-full px-3 py-2 text-sm text-gray-700 cursor-pointer hover:text-blue-700 hover:border-blue-300 ${
          selectedLanguage === 'all' ? 'text-blue-700 border-blue-300' : ''
        }`}
        title="All"
      >
        <span className="inline-flex items-center gap-1">All</span>
      </button>
      {availableLanguages.map((code) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          className={`bg-white border border-gray-200 shadow-sm rounded-r-full px-3 py-2 text-sm text-gray-700 cursor-pointer hover:text-blue-700 hover:border-blue-300 ${
            selectedLanguage === code ? 'text-blue-700 border-blue-300' : ''
          }`}
          title={resolveLanguageLabel(code)}
        >
          <span className="inline-flex items-center gap-1">{resolveLanguageLabel(code)}</span>
        </button>
      ))}
    </div>
  );
}
