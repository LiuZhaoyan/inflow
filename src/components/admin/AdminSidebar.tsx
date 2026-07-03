'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  TrendingUp,
  Settings,
  LogOut,
} from 'lucide-react';

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: 'Content',
      href: '/admin/content',
      icon: BookOpen,
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: TrendingUp,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full h-full paper-panel-flat border-r border-[var(--paper-1)] flex flex-col">
      {/* 品牌信息和关闭按钮 */}
      <div className="px-6 py-4 lg:py-6 border-b border-[var(--paper-1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--accent-0)] flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-display font-bold text-[var(--ink-0)]">
            Admin
          </span>
        </div>
        <button
          className="lg:hidden text-[var(--ink-2)] hover:text-[var(--ink-0)]"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                group relative flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  active
                    ? 'bg-[var(--accent-0)] text-white shadow-md'
                    : 'text-[var(--ink-1)] hover:bg-[var(--paper-1)] hover:text-[var(--ink-0)]'
                }
              `}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={active ? 'font-semibold' : 'font-medium'}>
                {item.label}
              </span>
              {active && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent-0)] rounded-l" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 页脚信息 */}
      <div className="px-6 py-4 border-t border-[var(--paper-1)] space-y-3">
        {/* 用户信息 */}
        <div className="space-y-1">
          <p className="text-xs uppercase text-[var(--ink-2)] tracking-wider">
            Logged in as
          </p>
          <p className="text-sm font-medium text-[var(--ink-0)] truncate">
            {session?.user?.email || 'Admin'}
          </p>
        </div>

        {/* 登出按钮 */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full paper-btn-ghost p-2 text-sm rounded flex items-center justify-center gap-2 hover:bg-[var(--paper-1)]"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
