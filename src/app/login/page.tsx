'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-surface page-surface-operation flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="paper-title text-4xl text-[var(--ink-0)]">Inflow</h1>
          <p className="paper-subtitle text-sm mt-2">Sign in to continue learning</p>
        </div>

        {/* Card */}
        <div className="paper-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)] mb-2 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="paper-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)] mb-2 block">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="paper-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--danger)] bg-[#fee2e2] border border-[#fecaca] rounded-[12px] px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="paper-btn-primary w-full"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              Sign in
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-[var(--ink-2)] mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-[var(--accent-1)] hover:text-[#6b21a8] transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
