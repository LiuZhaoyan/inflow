import { useCallback, useMemo } from 'react';
import type { LanguageCode } from '@/lib/core/language';

const LAST_LANGUAGE_KEY = 'learn-chat:last-language';
const LAST_CONTEXT_PREFIX = 'learn-chat:last-context:';
const COOLDOWN_FEATURE_FLAG_KEY = 'learnChatCooldownEnabled';

function getContextKey(language: LanguageCode): string {
    return `${LAST_CONTEXT_PREFIX}${language}`;
}

export function useLearnChatPersistence() {
    const isBrowser = typeof window !== 'undefined';

    const isCooldownEnabled = useCallback((): boolean => {
        if (!isBrowser) return true;
        const value = localStorage.getItem(COOLDOWN_FEATURE_FLAG_KEY);
        return value !== 'false';
    }, [isBrowser]);

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
        isCooldownEnabled,
        getLastLanguage,
        setLastLanguage,
        getLastContext,
        setLastContext,
    }), [
        isCooldownEnabled,
        getLastLanguage,
        setLastLanguage,
        getLastContext,
        setLastContext,
    ]);
}
