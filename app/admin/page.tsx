'use client';

import { useEffect, useState } from 'react';
import DashboardCard from '@/components/admin/DashboardCard';
import { TrendingUp, AlertTriangle, Users } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  totalChats: number;
  learningSessionsToday: number;
  avgLearningDuration: number;
  errorsToday: number;
  errorRate: number;
  recentErrors: Array<{
    id: string;
    message: string;
    timestamp: string;
    endpoint: string;
  }>;
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardCard
                title="Chats Today"
                value={stats.totalChats.toLocaleString()}
                icon={TrendingUp}
                color="accent"
              />
              <DashboardCard
                title="Learning Sessions"
                value={stats.learningSessionsToday.toLocaleString()}
                icon={TrendingUp}
                color="success"
              />
              <DashboardCard
                title="Avg Duration"
                value={`${Math.round(stats.avgLearningDuration)}m`}
                icon={TrendingUp}
                color="sage"
                subtitle="per session"
              />
            </div>
          </div>

          {/* 错误监控卡片区 */}
          <div>
            <h2 className="text-[var(--text-title-sm)] font-display font-bold text-[var(--ink-0)] mb-4">
              Error Monitoring
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DashboardCard
                title="Errors Today"
                value={stats.errorsToday.toLocaleString()}
                icon={AlertTriangle}
                color={stats.errorsToday > 10 ? 'danger' : 'warning'}
              />
              <DashboardCard
                title="Error Rate"
                value={`${stats.errorRate.toFixed(2)}%`}
                icon={AlertTriangle}
                color={stats.errorRate > 1 ? 'danger' : 'warning'}
              />
              <div className="paper-card paper-panel-flat p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase text-[var(--ink-2)] tracking-wider font-medium">
                    System Status
                  </p>
                  <div className="w-3 h-3 bg-[var(--sage-0)] rounded-full animate-pulse" />
                </div>
                <p className="text-2xl font-bold text-[var(--ink-0)]">Healthy</p>
              </div>
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

          {/* 最近错误 */}
          {stats.recentErrors.length > 0 && (
            <div>
              <h2 className="text-[var(--text-title-sm)] font-display font-bold text-[var(--ink-0)] mb-4">
                Recent Errors
              </h2>
              <div className="paper-panel-flat rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--paper-1)] bg-[var(--paper-1)]">
                      <th className="px-4 py-3 text-left font-semibold text-[var(--ink-0)]">
                        Endpoint
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--ink-0)]">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--ink-0)]">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentErrors.slice(0, 5).map((err) => (
                      <tr
                        key={err.id}
                        className="border-b border-[var(--paper-1)] hover:bg-[var(--paper-note)] transition-colors"
                      >
                        <td className="px-4 py-3 text-[var(--ink-1)] font-mono text-xs">
                          {err.endpoint}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink-1)] truncate max-w-xs">
                          {err.message}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink-2)] text-xs">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
