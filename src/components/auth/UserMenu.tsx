'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
};

export default function UserMenu({ name, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const menuRef = useClickOutsideClose(open, closeMenu);

  return (
    <div
      className="relative"
      ref={menuRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={closeMenu}
    >
      <Link
        href="/profile"
        onFocus={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ede9fe] text-[var(--ink-2)] border border-[var(--line-0)] hover:text-[var(--accent-1)] hover:border-[var(--line-1)] transition-colors"
        title="Profile"
        aria-label="Profile"
      >
        <User size={16} />
      </Link>

      {open && (
        <div className="absolute left-1/2 top-full mt-1 w-30 -translate-x-1/2 rounded-xl border border-[var(--line-0)] bg-[var(--paper-0)] shadow-md p-2">
          <div className="px-2 py-2 border-b border-[var(--line-0)]">
            <p className="text-sm font-semibold text-[var(--ink-1)] truncate">{name || 'User'}</p>
            <p className="text-xs text-[var(--ink-2)] truncate">{email || '—'}</p>
          </div>

          <div className="py-1 border-b border-[var(--line-0)]">
            <Link
              href="/vocabulary"
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-[var(--ink-2)] rounded-lg hover:bg-[var(--paper-1)]"
            >
              Vocabulary
            </Link>
            <Link
              href="/learn"
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-[var(--ink-2)] rounded-lg hover:bg-[var(--paper-1)]"
            >
              AI Tutor
            </Link>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
