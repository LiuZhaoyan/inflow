'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  MessageCircle,
  Library,
  ArrowRight,
  Pencil,
  X,
  Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import type { UserProfile } from '@/lib/types/user';
import { resolveLanguageLabel, LANGUAGE_OPTIONS } from '@/lib/language';

interface ProfileStats {
  vocabulary: { total: number; byLanguage: Record<string, number> };
  sentences: { total: number; byLanguage: Record<string, number> };
  books: { total: number };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', nativeLanguage: 'en', targetLanguage: 'ko' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then(r => r.json()),
      fetch('/api/profile/stats').then(r => r.json()),
    ])
      .then(([userData, statsData]) => {
        setProfile(userData.profile);
        setStats(statsData);
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

  const initials = (profile?.username || '?').slice(0, 2).toUpperCase();

  const statCards: {
    key: string;
    icon: React.ReactNode;
    label: string;
    total: number;
    byLanguage?: Record<string, number>;
    href: string;
    color: string;
    bgColor: string;
  }[] = stats
    ? [
        {
          key: 'vocabulary',
          icon: <BookOpen size={22} />,
          label: 'Vocabulary',
          total: stats.vocabulary.total,
          byLanguage: stats.vocabulary.byLanguage,
          href: '/vocabulary',
          color: 'text-violet-600',
          bgColor: 'bg-violet-50',
        },
        {
          key: 'sentences',
          icon: <MessageCircle size={22} />,
          label: 'Mastered Sentences',
          total: stats.sentences.total,
          byLanguage: stats.sentences.byLanguage,
          href: '/learn',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
        },
        {
          key: 'books',
          icon: <Library size={22} />,
          label: 'Books',
          total: stats.books.total,
          href: '/library',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
        <Header showProfile={false} />
        <main className="flex items-center justify-center pt-40">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">
      <Header showProfile={false} />

      <main className="max-w-3xl mx-auto px-6 pb-20 pt-10">
        {/* Page heading */}
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase text-blue-600 tracking-wider mb-1">Profile</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            Your Learning&nbsp;<span className="text-blue-600">Profile</span>
          </h1>
        </div>

        {/* ── Profile Card ── */}
        <section className="relative bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8 mb-8">
          <button
            onClick={() => { setEditing(true); setSaveError(null); }}
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit profile"
          >
            <Pencil size={18} />
          </button>

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold select-none">
              {initials}
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {profile?.username || 'Unnamed Learner'}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>
                  <span className="font-medium text-gray-700">Native:</span>{' '}
                  {resolveLanguageLabel(profile?.nativeLanguage as any)}
                </span>
                <span>
                  <span className="font-medium text-gray-700">Target:</span>{' '}
                  {resolveLanguageLabel(profile?.targetLanguage as any)}
                </span>
              </div>

              {profile?.createdAt && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Stats Overview ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map(card => (
            <Link
              key={card.key}
              href={card.href}
              className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-blue-100 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.bgColor} ${card.color} mb-4`}>
                  {card.icon}
                </div>

                <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-extrabold text-gray-900">{card.total}</p>

                {card.byLanguage && Object.keys(card.byLanguage).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(card.byLanguage)
                      .sort((a, b) => b[1] - a[1])
                      .map(([lang, count]) => (
                        <span
                          key={lang}
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                        >
                          {resolveLanguageLabel(lang as any)} {count}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center text-sm font-semibold text-blue-600 gap-1 group-hover:gap-2 transition-all">
                View <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </section>

        {/* ── Quick Links ── */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Vocabulary', href: '/vocabulary', desc: 'Review flashcards' },
              { label: 'Library', href: '/library', desc: 'Browse your books' },
              { label: 'Learn', href: '/learn', desc: 'Practice sentences' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-400">{link.desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Profile</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Edit your profile</h2>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. Lina"
                  className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Native Language
                  </label>
                  <select
                    value={form.nativeLanguage}
                    onChange={e => setForm(prev => ({ ...prev, nativeLanguage: e.target.value }))}
                    className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={`native-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Target Language
                  </label>
                  <select
                    value={form.targetLanguage}
                    onChange={e => setForm(prev => ({ ...prev, targetLanguage: e.target.value }))}
                    className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={`target-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {saveError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {saveError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
