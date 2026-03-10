import type { ReactNode } from 'react';

export interface ProfileStats {
  vocabulary: { total: number; byLanguage: Record<string, number> };
  sentences: { total: number; byLanguage: Record<string, number> };
  books: { total: number };
  stories: { total: number };
}

export interface ProfileFormState {
  username: string;
  nativeLanguage: string;
  targetLanguage: string;
}

export interface ProfileStatCard {
  key: string;
  icon: ReactNode;
  label: string;
  total: number;
  byLanguage?: Record<string, number>;
  href: string;
  iconClassName: string;
  chipClassName: string;
}

export interface ProfileQuickLink {
  label: string;
  href: string;
  desc: string;
}