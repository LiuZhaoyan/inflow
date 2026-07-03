'use client';

import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'accent' | 'success' | 'sage' | 'warning' | 'danger';
  trend?: string;
  subtitle?: string;
}

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  color = 'accent',
  trend,
  subtitle,
}: DashboardCardProps) {
  const colorMap = {
    accent: {
      bg: 'bg-[var(--accent-0)] bg-opacity-10',
      text: 'text-[var(--accent-0)]',
      border: 'border-[var(--accent-0)]',
    },
    success: {
      bg: 'bg-[var(--sage-0)] bg-opacity-10',
      text: 'text-[var(--sage-0)]',
      border: 'border-[var(--sage-0)]',
    },
    sage: {
      bg: 'bg-[var(--sage-0)] bg-opacity-10',
      text: 'text-[var(--sage-0)]',
      border: 'border-[var(--sage-0)]',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    danger: {
      bg: 'bg-[var(--berry-0)] bg-opacity-10',
      text: 'text-[var(--berry-0)]',
      border: 'border-[var(--berry-0)]',
    },
  };

  const colors = colorMap[color];

  return (
    <div className={`paper-card paper-panel-flat p-6 rounded-lg border-l-4 ${colors.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase text-[var(--ink-2)] tracking-wider font-medium">
            {title}
          </p>
          <p className="text-3xl lg:text-4xl font-bold text-[var(--ink-0)] mt-3 break-words">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--ink-2)] mt-2">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-[var(--sage-0)] mt-2 font-medium">
              {trend}
            </p>
          )}
        </div>
        <div className={`${colors.bg} p-4 rounded-lg ml-4 flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
