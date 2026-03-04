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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        title="User menu"
        aria-label="User menu"
      >
        <User size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-md p-2">
          <div className="px-2 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{email || '—'}</p>
          </div>

          <Link
            href="/profile"
            onClick={closeMenu}
            className="mt-1 flex items-center gap-2 px-2 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <User size={14} />
            Profile
          </Link>

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
