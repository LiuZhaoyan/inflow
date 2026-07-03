"use client";

import Link from "next/link";
import { useSession } from 'next-auth/react';
import UserMenu from '@/components/auth/UserMenu';
import ProfileAvatarLink from '@/components/auth/ProfileAvatarLink';

export type HeaderProps = {
  homeLink?: boolean;
  rightText?: string;
  showProfile?: boolean;
};

export default function Header({ homeLink = true, rightText = "Beta v0.1", showProfile = true }: HeaderProps) {
  const { data: session } = useSession();

  const logo = (
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--ink-1)]">
      <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
      Inflow
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line-0)] bg-[rgba(233,222,205,0.9)] backdrop-blur-md">
      <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
        {homeLink ? (
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--ink-1)] hover:text-[var(--accent-1)] transition-colors"
          >
            <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
            Inflow
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
    </header>
  );
}
