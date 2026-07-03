'use client';

import { useEffect, useState } from 'react';
import DashboardCard from '@/components/admin/DashboardCard';
import { TrendingUp, Users } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  totalChats: number;
  learningSessionsToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard stats: ${res.status}`);
        }
        const data = await res.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="h-8 w-8 border-4 border-[var(--accent-0)] border-t-transparent rounded-full" />
          </div>
          <p className="text-[var(--ink-1)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paper-alert-soft-danger p-6 rounded-lg">
        <p className="font-semibold text-[var(--berry-0)]">Error loading dashboard</p>
        <p className="text-sm text-[var(--ink-1)] mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-[var(--text-title-md)] font-display font-bold text-[var(--ink-0)]">
          Admin Dashboard
        </h1>
        <p className="text-[var(--ink-2)] mt-2">
          Welcome to the Inflow admin panel. Monitor system health and manage users.
        </p>
      </div>

      {stats && (
        <>
          {/* 用户统计卡片区 */}
          <div>
            <h2 className="text-[var(--text-title-sm)] font-display font-bold text-[var(--ink-0)] mb-4">
              User Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                icon={Users}
                color="accent"
                trend={`+${stats.newUsersToday} today`}
              />
              <DashboardCard
                title="Active Users"
                value={stats.activeUsers.toLocaleString()}
                icon={TrendingUp}
                color="success"
                subtitle="Last 7 days"
              />
              <DashboardCard
                title="New Today"
                value={stats.newUsersToday.toLocaleString()}
                icon={Users}
                color="sage"
              />
            </div>
          </div>

          {/* 学习活动卡片区 */}
          <div>
            <h2 className="text-[var(--text-title-sm)] font-display font-bold text-[var(--ink-0)] mb-4">
              Learning Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardCard
                title="Total Chat Messages"
                value={stats.totalChats.toLocaleString()}
                icon={TrendingUp}
                color="accent"
              />
              <DashboardCard
                title="Learning Sessions Today"
                value={stats.learningSessionsToday.toLocaleString()}
                icon={TrendingUp}
                color="success"
              />
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-[var(--paper-1)] rounded-lg p-6 space-y-4">
            <h3 className="text-[var(--text-label)] font-semibold text-[var(--ink-0)] uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/admin/users"
                className="paper-btn-primary px-4 py-3 rounded inline-block text-center transition-all hover:shadow-md"
              >
                Manage Users
              </a>
              <a
                href="/admin/analytics"
                className="paper-btn-ghost px-4 py-3 rounded inline-block text-center transition-all hover:bg-[var(--paper-0)]"
              >
                View Analytics
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
