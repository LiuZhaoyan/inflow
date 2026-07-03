'use client';

import Link from 'next/link';
import { User } from 'lucide-react';

type ProfileAvatarLinkProps = {
  href?: string;
  title?: string;
};

export default function ProfileAvatarLink({ href = '/profile', title = 'Profile' }: ProfileAvatarLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f3e8d7] text-[var(--ink-2)] border border-[var(--line-0)] hover:text-[var(--accent-1)] hover:border-[var(--line-1)] transition-colors"
      title={title}
      aria-label={title}
    >
      <User size={16} />
    </Link>
  );
}