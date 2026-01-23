'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, ArrowRight, Info, MessageCircle } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/language';

interface UserProfile {
  username: string;
  nativeLanguage: string;
  targetLanguage: string;
  isOnboarded?: boolean;
}

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
        setProfileError('保存失败，请重试。');
      }
    } catch (error) {
      console.error(error);
      setProfileError('保存失败，请检查网络后重试。');
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
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            Inflow
          </div>
          <nav className="text-sm text-gray-500 font-medium">
            {/* 这里预留位置，暂时不放复杂菜单 */}
            <span>Beta v0.1</span>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 pb-20">
        
        {/* 2. Hero Section: 强调理念，弱化装饰 */}
        <section className="py-16 md:py-24 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Acquire language, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              don&apos;t memorize it.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
            Immerse yourself in stories slightly above your level. 
            Click to translate contextually. Master vocabulary naturally.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/user"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
            >
              Enter your library
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-300 shadow-sm text-lg"
            >
              <Info size={20} />
              Learn the philosophy
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
             <h2 className="text-xl font-semibold text-gray-900 mb-4">New Features</h2>
             <div className="flex flex-col sm:flex-row gap-4">
                 <Link
                    href="/vocabulary"
                    className="group flex flex-col p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 w-full sm:w-64"
                 >
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                       <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">Vocabulary</h3>
                        <p className="text-sm text-gray-500">AI Flashcards & Stories</p>
                    </div>
                 </Link>
                 
                 <Link
                    href="/learn"
                    className="group flex flex-col p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 w-full sm:w-64"
                 >
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                       <MessageCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">AI Tutor</h3>
                        <p className="text-sm text-gray-500">Sentence-based Learning</p>
                    </div>
                 </Link>
             </div>
          </div>
        </section>

      </main>
    </div>
  );
}
