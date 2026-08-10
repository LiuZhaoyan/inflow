'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // 检查权限
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/login');
      return;
    }

    // 验证管理员权限
    const checkAdminRole = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.status === 401) {
          router.push('/login');
        } else if (res.status === 403) {
          // 无权限访问管理员页面
          router.push('/');
        } else {
          setIsAuthorized(true);
        }
      } catch {
        router.push('/');
      }
    };

    checkAdminRole();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--paper-0)]">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="h-8 w-8 border-4 border-[var(--accent-0)] border-t-transparent rounded-full" />
          </div>
          <p className="mt-4 text-[var(--ink-1)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--paper-0)]">
        <div className="text-center paper-card p-8">
          <p className="text-[var(--ink-0)] font-bold">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper-0)]">
      {/* 顶部 Header */}
      <Header variant="learn" learnTitle="Admin" learnSubtitle="MANAGEMENT" />

      <div className="flex mt-16">
        {/* 侧栏导航 */}
        <div className="hidden lg:block w-60 fixed h-screen top-16 overflow-y-auto">
          <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        {/* 移动菜单 */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 top-16"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {isSidebarOpen && (
          <div className="lg:hidden fixed z-50 w-60 top-16 h-screen overflow-y-auto">
            <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        )}

        {/* 主内容区域 */}
        <main className="flex-1 lg:ml-60 px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* 移动菜单按钮 */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 paper-btn-primary p-3 rounded-full shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
