export interface UserProfile {
  id: string;
  username: string;
  nativeLanguage: string;
  targetLanguage: string;
  currentLanguageCode?: string;
  isOnboarded: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_USER: UserProfile = {
  id: 'single-user',
  username: '',
  nativeLanguage: 'en',
  targetLanguage: 'ko',
  currentLanguageCode: 'ko',
  isOnboarded: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
