'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // 1. Register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          username: username.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // 2. Auto sign-in after registration
      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed — redirect to login
        router.push('/login');
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
          <p className="paper-subtitle text-sm mt-2">Create your account</p>
        </div>

        {/* Card */}
        <div className="paper-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)] mb-2 block">
                Name <span className="text-[var(--ink-3)]">(optional)</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="paper-input"
                placeholder="Your name"
              />
            </div>

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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="paper-input"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)] mb-2 block">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="paper-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--danger)] bg-[#fbe8e4] border border-[#efc7be] rounded-[12px] px-3 py-2">
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
                <UserPlus size={16} />
              )}
              Create account
            </button>
          </form>
        </div>

        {/* Sign-in link */}
        <p className="text-center text-sm text-[var(--ink-2)] mt-4">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--accent-1)] hover:text-[#7e4224] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
