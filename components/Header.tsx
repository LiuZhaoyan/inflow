"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useSession } from 'next-auth/react';
import UserMenu from '@/components/auth/UserMenu';

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
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line-0)] bg-[rgba(251,245,236,0.82)] backdrop-blur-md">
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
              <Link
                href="/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f3e8d7] text-[var(--ink-2)] border border-[var(--line-0)] hover:text-[var(--accent-1)] hover:border-[var(--line-1)] transition-colors"
                title="Profile"
              >
                <User size={16} />
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
