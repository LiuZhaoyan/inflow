'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Info, MessageCircle } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/core/language';
import type { UserProfile } from '@/lib/types/user';

export default function Home() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    nativeLanguage: 'en',
    targetLanguage: 'ko'
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          const profile = data?.profile as UserProfile | undefined;
          if (profile) {
            setUserProfile(profile);
            setProfileForm({
              username: profile.username || '',
              nativeLanguage: profile.nativeLanguage || 'en',
              targetLanguage: profile.targetLanguage || 'ko'
            });
            setShowProfileModal(!profile.isOnboarded);
          } else {
            setShowProfileModal(true);
          }
        } else {
          setShowProfileModal(true);
        }
      } catch (err) {
        console.error('Failed to load user profile', err);
        setShowProfileModal(true);
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, []);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileForm.username,
          nativeLanguage: profileForm.nativeLanguage,
          targetLanguage: profileForm.targetLanguage
        })
      });

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const profile = data?.profile as UserProfile | undefined;
      if (profile) {
        setUserProfile(profile);
        setShowProfileModal(false);
      } else {
        setProfileError('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setProfileError('save failed. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="page-surface page-surface-home text-[var(--foreground)] selection:bg-[#f1d6bd] selection:text-[#2d231c]">
      {!profileLoading && showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="paper-card reveal-up w-full max-w-lg mx-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="paper-chip">Start Learning</p>
                <h2 className="paper-title text-2xl mt-3">Set your learning profile</h2>
                <p className="paper-subtitle text-sm mt-2">We’ll use this to personalize lessons and translations.</p>
              </div>
              <div className="paper-chip">Required</div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">Username (Optional)</label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. Lina"
                  className="paper-input mt-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">Native Language</label>
                  <select
                    value={profileForm.nativeLanguage}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nativeLanguage: e.target.value }))}
                    className="paper-input mt-2"
                  >
                    {LANGUAGE_OPTIONS.map(option => (
                      <option key={`native-${option.value}`} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">Target Language</label>
                  <select
                    value={profileForm.targetLanguage}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, targetLanguage: e.target.value }))}
                    className="paper-input mt-2"
                  >
                    {LANGUAGE_OPTIONS.map(option => (
                      <option key={`target-${option.value}`} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {profileError && (
                <div className="text-sm text-[var(--danger)] bg-[#fbe8e4] border border-[#efc7be] rounded-[12px] px-3 py-2">
                  {profileError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="paper-btn-primary w-full"
              >
                {savingProfile ? 'Saving...' : 'Save and start learning'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <main className="w-full px-6 lg:px-12 pb-20">
        <section className="mt-12 pb-12 reveal-up md:mt-16 lg:mt-20">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <h1 className="paper-title text-4xl md:text-6xl lg:text-7xl mt-4 mb-6 leading-[1.05] text-[var(--ink-0)]">
                Acquire language, <br />
                <span className="mt-3 inline-block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-0)] to-[#8b4a2a] md:mt-4">
                  don&apos;t memorize it.
                </span>
              </h1>
              <p className="paper-subtitle text-lg md:text-xl mb-8 max-w-2xl">
                Inflow keeps input and feedback in one continuous learning loop.
                Immerse yourself in rich input, then sharpen every sentence with your AI tutor. 
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/learn"
                  className="paper-btn-primary text-lg px-8 py-4"
                >
                  Start AI Tutor
                </Link>
              </div>
              <div className="mt-5">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-2)] hover:text-[var(--accent-1)] transition-colors"
                >
                  <Info size={16} />
                  Learn the philosophy
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="reveal-up flex items-center gap-5 px-1 py-2 stagger-1">
                <img src="/icon.svg" alt="Inflow" className="h-32 w-32 md:h-40 md:w-40 lg:h-44 lg:w-44 shrink-0" />
                <div>
                  <h2 className="paper-title text-5xl md:text-6xl lg:text-7xl text-[var(--ink-0)]">Inflow</h2>
                </div>
              </div>

              <div className="paper-card-soft p-6 reveal-up stagger-1">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-[#eedfcd] flex items-center justify-center border border-[#dac4a6]">
                    <MessageCircle className="h-5 w-5 text-[var(--accent-1)]" />
                  </div>
                  <div>
                    <h3 className="paper-title text-xl">AI Tutor</h3>
                    <p className="paper-subtitle text-sm">Sentence-level coaching, always in context.</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-[var(--ink-2)]">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-0)]" />
                    Adaptive difficulty with immediate feedback.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-0)]" />
                    Explain, translate, or deepen understanding instantly.
                  </li>
                </ul>
                <Link
                  href="/learn"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-1)] hover:text-[#7f4527]"
                >
                  Practice now <ArrowRight size={16} />
                </Link>
              </div>

            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl mt-8 pt-10 paper-divider">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <h2 className="paper-title text-3xl">Your learning loop</h2>
            <p className="paper-subtitle text-sm">Build input, practice daily, retain vocabulary.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/learn"
              className="paper-card-soft group flex flex-col p-6 reveal-up stagger-2 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 shrink-0 text-[var(--accent-1)] group-hover:scale-110 transition-transform" />
                  <h3 className="paper-title text-xl">AI Tutor Sessions</h3>
                </div>
                <p className="paper-subtitle text-sm">Work through sentences with feedback.</p>
              </div>
            </Link>

            <Link
              href="/vocabulary"
              className="paper-card-soft group flex flex-col p-6 reveal-up stagger-3 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 shrink-0 text-[var(--accent-1)] group-hover:scale-110 transition-transform" />
                  <h3 className="paper-title text-xl">Vocabulary Studio</h3>
                </div>
                <p className="paper-subtitle text-sm">AI flashcards and story practice.</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
