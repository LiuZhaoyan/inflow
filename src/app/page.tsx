'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Info, MessageCircle } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/core/language';
import type { UserProfile } from '@/lib/types/user';

export default function Home() {
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
    <div className="page-surface page-surface-home text-[var(--foreground)] selection:bg-[#ede9fe] selection:text-[#4c1d95]">
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
                <div className="text-sm text-[var(--danger)] bg-[#fee2e2] border border-[#fecaca] rounded-[12px] px-3 py-2">
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
      
      <nav className="home-nav">
        <Link href="/" className="home-brand" aria-label="Inflow home">
          <img src="/icon.svg" alt="" className="h-10 w-10 shrink-0" />
          <span>Inflow</span>
        </Link>
        <div className="home-nav-links">
          <Link href="#features" className="home-nav-link">Features</Link>
          <Link href="#philosophy" className="home-nav-link">Philosophy</Link>
          <Link href="/login" className="home-nav-link">Login</Link>
        </div>
      </nav>

      <main className="w-full px-6 lg:px-12 pb-20">
        <section id="philosophy" className="mt-10 pb-12 reveal-up md:mt-14 lg:mt-16">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <h1 className="paper-title text-4xl md:text-6xl lg:text-7xl mt-4 mb-6 leading-[1.05] text-[#2e2538]">
                Acquire language, <br />
                <span className="mt-3 inline-block text-[#9333ea] md:mt-4">
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
                  className="paper-btn-primary home-primary-cta text-lg px-8 py-4"
                >
                  Start AI Tutor
                </Link>
              </div>
              <div className="mt-5">
                <Link
                  href="/doc"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-2)] hover:text-[var(--accent-1)] transition-colors"
                >
                  <Info size={16} />
                  Learn the philosophy
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="paper-card-soft p-6 reveal-up stagger-1">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
                    <MessageCircle className="h-5 w-5 fill-purple-500 text-purple-700 drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="paper-title text-xl">AI Tutor</h3>
                    <p className="home-card-copy text-sm">Sentence-level coaching, always in context.</p>
                  </div>
                </div>
                <ul className="home-card-copy mt-4 space-y-2 text-sm">
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
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9333ea] hover:text-[#7e22ce]"
                >
                  Practice now <ArrowRight size={16} />
                </Link>
              </div>

            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl mt-16">
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
                  <MessageCircle className="h-5 w-5 shrink-0 fill-purple-500 text-purple-700 drop-shadow-sm group-hover:scale-110 transition-transform" />
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
                  <Sparkles className="h-5 w-5 shrink-0 fill-yellow-400 text-amber-600 drop-shadow-sm group-hover:scale-110 transition-transform" />
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
