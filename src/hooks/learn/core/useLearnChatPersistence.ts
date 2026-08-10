import { useCallback, useMemo } from 'react';
import type { LanguageCode } from '@/lib/core/language';

const LAST_LANGUAGE_KEY = 'learn-chat:last-language';
const LAST_CONTEXT_PREFIX = 'learn-chat:last-context:';

function getContextKey(language: LanguageCode): string {
    return `${LAST_CONTEXT_PREFIX}${language}`;
}

export function useLearnChatPersistence() {
    const isBrowser = typeof window !== 'undefined';

    const getLastLanguage = useCallback((): string | null => {
        if (!isBrowser) return null;
        return localStorage.getItem(LAST_LANGUAGE_KEY);
    }, [isBrowser]);

    const setLastLanguage = useCallback((language: LanguageCode) => {
        if (!isBrowser) return;
        localStorage.setItem(LAST_LANGUAGE_KEY, language);
    }, [isBrowser]);

    const getLastContext = useCallback((language: LanguageCode): string | null => {
        if (!isBrowser) return null;
        return localStorage.getItem(getContextKey(language));
    }, [isBrowser]);

    const setLastContext = useCallback((language: LanguageCode, context: string) => {
        if (!isBrowser) return;
        localStorage.setItem(getContextKey(language), context);
    }, [isBrowser]);

    return useMemo(() => ({
        getLastLanguage,
        setLastLanguage,
        getLastContext,
        setLastContext,
    }), [
        getLastLanguage,
        setLastLanguage,
        getLastContext,
        setLastContext,
    ]);
}
