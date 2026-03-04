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
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900">
      <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
      Inflow
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
        {homeLink ? (
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
          >
            <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
            Inflow
          </Link>
        ) : (
          logo
        )}
        <nav className="flex items-center gap-4 text-sm text-gray-500 font-medium">
          <span>{rightText}</span>
          {showProfile && (
            session?.user ? (
              <UserMenu name={session.user.name} email={session.user.email} />
            ) : (
              <Link
                href="/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
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
