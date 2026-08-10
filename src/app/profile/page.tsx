'use client';

import { useEffect, useState } from 'react';
import { BookOpen, MessageCircle, ScrollText } from 'lucide-react';
import Header from '@/components/Header';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ProfileLoadingState from '@/components/profile/ProfileLoadingState';
import ProfileQuickLinks from '@/components/profile/ProfileQuickLinks';
import ProfileStatsSection from '@/components/profile/ProfileStatsSection';
import ProfileStoriesSection from '@/components/profile/ProfileStoriesSection';
import ProfileSummaryCard from '@/components/profile/ProfileSummaryCard';
import ProfileProgressLedger, { type ProfileProgressEvent } from '@/components/profile/ProfileProgressLedger';
import type { ProfileFormState, ProfileQuickLink, ProfileStatCard, ProfileStats } from '@/components/profile/types';
import type { UserProfile } from '@/lib/types/user';
import type { Story } from '@/lib/types/story';
import type { MasteredSentence } from '@/lib/types/progress';
import type { VocabularyWord } from '@/lib/types/vocabulary';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({ username: '', nativeLanguage: 'en', targetLanguage: 'ko' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [masteredSentences, setMasteredSentences] = useState<MasteredSentence[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [storiesExpanded, setStoriesExpanded] = useState(true);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then(r => r.json()),
      fetch('/api/profile/stats').then(r => r.json()),
      fetch('/api/stories').then(r => r.json()),
      fetch('/api/mastered-sentences?limit=8').then(r => r.json()),
      fetch('/api/vocabulary?limit=8').then(r => r.json()),
    ])
      .then(([userData, statsData, storiesData, sentencesData, vocabularyData]) => {
        setProfile(userData.profile);
        setStats(statsData);
        setStories(storiesData.stories || []);
        setMasteredSentences(sentencesData.sentences || []);
        setVocabulary(Array.isArray(vocabularyData) ? vocabularyData : vocabularyData.words || []);
        if (userData.profile) {
          setForm({
            username: userData.profile.username || '',
            nativeLanguage: userData.profile.nativeLanguage || 'en',
            targetLanguage: userData.profile.targetLanguage || 'ko',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProfile(data.profile);
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      const res = await fetch('/api/stories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setStories(prev => prev.filter(s => s.id !== id));
      if (expandedStoryId === id) setExpandedStoryId(null);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handleFormFieldChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const statCards: ProfileStatCard[] = stats
    ? [
        {
          key: 'vocabulary',
          icon: <BookOpen size={22} />,
          label: 'Vocabulary',
          total: stats.vocabulary.total,
          byLanguage: stats.vocabulary.byLanguage,
          href: '/vocabulary',
          iconClassName: 'text-[var(--accent-1)]',
          chipClassName: 'bg-[rgba(147,51,234,0.1)] text-[var(--accent-1)] border border-[rgba(147,51,234,0.14)]',
        },
        {
          key: 'sentences',
          icon: <MessageCircle size={22} />,
          label: 'Mastered Sentences',
          total: stats.sentences.total,
          byLanguage: stats.sentences.byLanguage,
          href: '/learn',
          iconClassName: 'text-[var(--success)]',
          chipClassName: 'bg-[rgba(95,125,98,0.12)] text-[var(--success)] border border-[rgba(95,125,98,0.16)]',
        },
        {
          key: 'stories',
          icon: <ScrollText size={22} />,
          label: 'Stories',
          total: stats.stories.total,
          href: '/vocabulary',
          iconClassName: 'text-[var(--ink-1)]',
          chipClassName: 'bg-[rgba(51,65,85,0.08)] text-[var(--ink-1)] border border-[rgba(51,65,85,0.12)]',
        },
      ]
    : [];

  const quickLinks: ProfileQuickLink[] = [
    { label: 'Vocabulary', href: '/vocabulary', desc: 'Review flashcards' },
    { label: 'Learn', href: '/learn', desc: 'Practice sentences' },
  ];

  const progressEvents: ProfileProgressEvent[] = [
    ...masteredSentences.map((sentence) => ({
      id: `sentence-${sentence.id}`,
      date: sentence.masteredAt,
      type: 'sentence' as const,
      title: 'Mastered a new sentence',
      detail: sentence.content,
      meta: sentence.context ? `Practised in ${sentence.context}` : 'Sentence practice',
    })),
    ...stories.map((story) => ({
      id: `story-${story.id}`,
      date: story.createdAt,
      type: 'story' as const,
      title: 'Wrote a short story',
      detail: story.content.replace(/\*\*/g, '').slice(0, 80),
      meta: story.language ? story.language.toUpperCase() : 'Story writing',
    })),
    ...vocabulary.map((word) => ({
      id: `word-${word.id}`,
      date: word.createdAt,
      type: 'vocabulary' as const,
      title: 'Added new vocabulary',
      detail: word.word,
      meta: word.language ? word.language.toUpperCase() : 'Vocabulary review',
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 8);

  if (loading) {
    return <ProfileLoadingState />;
  }

  return (
    <div className="page-surface page-surface-operation text-[var(--foreground)] font-sans selection:bg-[#ede9fe] selection:text-[#4c1d95]">
      <Header variant="learn" />

      <main className="max-w-5xl mx-auto px-4 md:px-5 pb-20 pt-10">
        <ProfileSummaryCard
          profile={profile}
          onEdit={() => {
            setEditing(true);
            setSaveError(null);
          }}
        />
        <ProfileStatsSection statCards={statCards} />
        <ProfileStoriesSection
          stories={stories}
          storiesExpanded={storiesExpanded}
          expandedStoryId={expandedStoryId}
          onToggleExpanded={() => setStoriesExpanded((prev) => !prev)}
          onToggleStory={(id) => setExpandedStoryId((prev) => (prev === id ? null : id))}
          onDeleteStory={handleDeleteStory}
        />
        <ProfileProgressLedger events={progressEvents} />
        <ProfileQuickLinks links={quickLinks} />
      </main>

      {editing && (
        <EditProfileModal
          form={form}
          saving={saving}
          saveError={saveError}
          onClose={() => setEditing(false)}
          onSubmit={handleSave}
          onFieldChange={handleFormFieldChange}
        />
      )}
    </div>
  );
}
