"use client";

import Link from "next/link";
import { useSession } from 'next-auth/react';
import { ArrowLeft, Ellipsis } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import ProfileAvatarLink from '@/components/auth/ProfileAvatarLink';

export type HeaderProps = {
  homeLink?: boolean;
  rightText?: string;
  showProfile?: boolean;
  variant?: 'default' | 'learn';
  learnTitle?: string;
  learnSubtitle?: string;
};

export default function Header({ homeLink = true, rightText = "Beta v0.1", showProfile = true, variant = 'default', learnTitle = 'Profile', learnSubtitle = 'LEARNING RECORD' }: HeaderProps) {
  const { data: session } = useSession();

  const logo = (
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--ink-1)]">
      <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
      Inflow
    </div>
  );

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-[var(--line-0)] backdrop-blur-md ${variant === 'learn' ? 'bg-white' : 'bg-[rgba(233,222,205,0.9)]'}`}>
      {variant === 'learn' ? (
        <div className="mx-auto grid h-[52px] w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-12">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--learn-line)] bg-[rgba(251,247,251,0.54)] text-[var(--ink-1)] transition-colors hover:text-[var(--accent-1)]" title="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <div className="justify-self-center text-center">
            <span className="block font-serif text-xl font-bold leading-5 text-[var(--ink-0)] sm:text-2xl sm:leading-6">{learnTitle}</span>
            <span className="mt-0.5 block text-[10px] font-extrabold leading-3 tracking-[0.09em] text-[var(--accent-1)]">{learnSubtitle}</span>
          </div>
          <div className="flex items-center justify-self-end gap-2">
            <Ellipsis size={20} className="text-[var(--ink-2)]" />
            {showProfile && (
              session?.user ? <UserMenu name={session.user.name} email={session.user.email} /> : <ProfileAvatarLink />
            )}
          </div>
        </div>
      ) : (
      <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
        {homeLink ? (
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--ink-1)] hover:text-[var(--accent-1)] transition-colors"
          >
            {logo}
          </Link>
        ) : (
          logo
        )}
        <nav className="flex items-center gap-4 text-sm text-[var(--ink-2)] font-medium">
          <span className="paper-chip">{rightText}</span>
          {showProfile && (
            session?.user ? (
              <UserMenu name={session.user.name} email={session.user.email} />
            ) : (
              <ProfileAvatarLink />
            )
          )}
        </nav>
      </div>
      )}
    </header>
  );
}
