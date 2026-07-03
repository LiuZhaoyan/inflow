const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  ru: 'Russian',
};

export type LanguageCode = keyof typeof LANGUAGE_LABELS | 'auto';

export function resolveLanguageLabel(code: LanguageCode | undefined | null): string {
  if (!code || code === 'auto') return 'Auto';
  return LANGUAGE_LABELS[code] || code.toUpperCase();
}

export function normalizeLanguageCode(code?: string | null): LanguageCode {
  const normalized = (code || '').trim().toLowerCase();
  if (!normalized) return 'auto';
  if (normalized in LANGUAGE_LABELS) return normalized as LanguageCode;
  return 'auto';
}

export function detectLanguageHint(text: string): { code: LanguageCode; reason: string } {
  const trimmed = (text || '').trim();
  if (!trimmed) return { code: 'auto', reason: 'empty' };

  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(trimmed)) return { code: 'ko', reason: 'contains_hangul' };
  if (/[ぁ-ゟ゠-ヿ]/.test(trimmed)) return { code: 'ja', reason: 'contains_kana' };
  if (/[\u4E00-\u9FFF]/.test(trimmed)) return { code: 'zh', reason: 'contains_cjk' };
  if (/[А-Яа-яЁё]/.test(trimmed)) return { code: 'ru', reason: 'contains_cyrillic' };
  if (/[A-Za-z]/.test(trimmed)) return { code: 'en', reason: 'contains_latin' };

  return { code: 'auto', reason: 'no_script_signal' };
}

export function detectLanguageFromSentences(sentences: string[]): { code: LanguageCode; reason: string } {
  if (!sentences?.length) return { code: 'auto', reason: 'no_sentences' };
  const joined = sentences.join(' ').slice(0, 5000);
  return detectLanguageHint(joined);
}

export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'en', label: LANGUAGE_LABELS.en },
  { value: 'zh', label: LANGUAGE_LABELS.zh },
  { value: 'ja', label: LANGUAGE_LABELS.ja },
  { value: 'ko', label: LANGUAGE_LABELS.ko },
  { value: 'fr', label: LANGUAGE_LABELS.fr },
  { value: 'es', label: LANGUAGE_LABELS.es },
  { value: 'de', label: LANGUAGE_LABELS.de },
  { value: 'ru', label: LANGUAGE_LABELS.ru },
];
