'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, ArrowRight, Info, MessageCircle } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/language';
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      {!profileLoading && showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Start Learning</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Set your learning profile</h2>
                <p className="text-sm text-gray-500 mt-1">We’ll use this to personalize lessons and translations.</p>
              </div>
              <div className="text-xs text-gray-400 font-semibold px-2 py-1 bg-gray-50 rounded-full border">Required</div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username (Optional)</label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. Lina"
                  className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Native Language</label>
                  <select
                    value={profileForm.nativeLanguage}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nativeLanguage: e.target.value }))}
                    className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {LANGUAGE_OPTIONS.map(option => (
                      <option key={`native-${option.value}`} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Language</label>
                  <select
                    value={profileForm.targetLanguage}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, targetLanguage: e.target.value }))}
                    className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {LANGUAGE_OPTIONS.map(option => (
                      <option key={`target-${option.value}`} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {profileError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {profileError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save and start learning'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* 1. Header: 极其简单，只保留 Logo */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900">
            <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
            Inflow
          </div>
          <nav className="text-sm text-gray-500 font-medium">
            {/* 这里预留位置，暂时不放复杂菜单 */}
            <span>Beta v0.1</span>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 pb-20">
        <section className="pt-16 md:pt-24 pb-12">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Inflow AI Studio</p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mt-4 mb-6 leading-tight">
                Acquire language, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  don&apos;t memorize it.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
                Immerse yourself in your personal library, then sharpen every sentence with your AI tutor. Inflow keeps
                input, feedback, and vocabulary in one continuous learning loop.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                >
                  Start AI Tutor
                  <MessageCircle size={20} />
                </Link>
                <Link
                  href="/library"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-300 shadow-sm text-lg"
                >
                  Open your library
                  <BookOpen size={20} />
                </Link>
              </div>
              <div className="mt-5">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Info size={16} />
                  Learn the philosophy
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-indigo-600/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Tutor</h3>
                    <p className="text-sm text-gray-600">Sentence-level coaching, always in context.</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Adaptive difficulty with immediate feedback.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Explain, translate, or deepen understanding instantly.
                  </li>
                </ul>
                <Link
                  href="/learn"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  Practice now <ArrowRight size={16} />
                </Link>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-blue-600/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Library</h3>
                    <p className="text-sm text-gray-600">Curate stories and track what you read.</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Organize input by level and topic.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Jump into any story with instant translations.
                  </li>
                </ul>
                <Link
                  href="/library"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Visit your library <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl mt-8 pt-10 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Your learning loop</h2>
            <p className="text-sm text-gray-500">Build input, practice daily, retain vocabulary.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/library"
              className="group flex flex-col p-6 rounded-2xl bg-white border border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reading Library</h3>
                <p className="text-sm text-gray-500">Collect stories and reading goals.</p>
              </div>
            </Link>

            <Link
              href="/learn"
              className="group flex flex-col p-6 rounded-2xl bg-white border border-indigo-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Tutor Sessions</h3>
                <p className="text-sm text-gray-500">Work through sentences with feedback.</p>
              </div>
            </Link>

            <Link
              href="/vocabulary"
              className="group flex flex-col p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Vocabulary Studio</h3>
                <p className="text-sm text-gray-500">AI flashcards and story practice.</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
