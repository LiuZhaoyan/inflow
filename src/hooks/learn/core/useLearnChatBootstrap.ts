import { useEffect } from 'react';
import type { UserProfile } from '@/lib/types/user';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/core/language';
import { logger } from '@/lib/core/logger';
import { fetchPlacementStatus, fetchProfile } from '@/hooks/learn/services/learnChatApi';

interface UseLearnChatBootstrapInput {
    getLastLanguage: () => string | null;
    setUserProfile: (profile: UserProfile | null) => void;
    setProfileLoading: (loading: boolean) => void;
    setPlacementCompleted: (completed: boolean) => void;
    setDifficultyLevel: (level: number) => void;
    setPlacementLoading: (loading: boolean) => void;
    setSelectedLanguage: (language: LanguageCode) => void;
}

export function useLearnChatBootstrap(input: UseLearnChatBootstrapInput) {
    const {
        getLastLanguage,
        setUserProfile,
        setProfileLoading,
        setPlacementCompleted,
        setDifficultyLevel,
        setPlacementLoading,
        setSelectedLanguage,
    } = input;

    useEffect(() => {
        const init = async () => {
            try {
                const profile = await fetchProfile();
                setUserProfile(profile);

                const savedLanguage = getLastLanguage();
                const fallbackLanguage = profile?.currentLanguageCode || profile?.targetLanguage || 'en';
                const normalizedSaved = normalizeLanguageCode(savedLanguage || fallbackLanguage);
                const initialLanguage = normalizedSaved === 'auto'
                    ? normalizeLanguageCode(fallbackLanguage)
                    : normalizedSaved;

                setSelectedLanguage(initialLanguage);
            } catch (err) {
                logger.error('useLearnChatBootstrap: Failed to load user profile', err);
                setUserProfile(null);
                setSelectedLanguage('en');
            } finally {
                setProfileLoading(false);
            }

            try {
                const placement = await fetchPlacementStatus();
                setPlacementCompleted(placement.completed);
                setDifficultyLevel(placement.level);
            } catch (err) {
                logger.error('useLearnChatBootstrap: Failed to load placement status', err);
            } finally {
                setPlacementLoading(false);
            }
        };

        void init();
    }, [
        getLastLanguage,
        setDifficultyLevel,
        setPlacementCompleted,
        setPlacementLoading,
        setProfileLoading,
        setSelectedLanguage,
        setUserProfile,
    ]);
}
