export interface ProfileStats {
  vocabulary: { total: number; byLanguage: Record<string, number> };
  sentences: { total: number; byLanguage: Record<string, number> };
  stories: { total: number };
}

export interface ProfileFormState {
  username: string;
  nativeLanguage: string;
  targetLanguage: string;
}

export interface ProfileStatCard {
  key: string;
  label: string;
  total: number;
  byLanguage?: Record<string, number>;
  href: string;
  detailClassName: string;
}

export interface ProfileQuickLink {
  label: string;
  href: string;
  desc: string;
}
