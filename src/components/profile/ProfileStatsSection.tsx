import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { resolveLanguageLabel } from '@/lib/core/language';
import type { ProfileStatCard } from './types';

interface ProfileStatsSectionProps {
  statCards: ProfileStatCard[];
}

export default function ProfileStatsSection({ statCards }: ProfileStatsSectionProps) {
  return (
    <section className="mb-10 grid grid-cols-3 rounded-[var(--radius-xl)] bg-[var(--learn-surface)] p-5 sm:p-7">
      {statCards.map((card) => {
        const CardWrapper = card.href.startsWith('#') ? 'a' : Link;

        return (
          <CardWrapper
            key={card.key}
            href={card.href}
            className="group flex min-w-0 flex-col border-r border-[var(--learn-line)] px-3 last:border-r-0 sm:px-7"
          >
            <div>
              <p className="mb-1 truncate text-xs font-semibold text-[var(--ink-2)] sm:text-sm">{card.label}</p>
              <p className="paper-title text-3xl sm:text-4xl">{card.total}</p>

              {card.byLanguage && Object.keys(card.byLanguage).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(card.byLanguage)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, count]) => (
                      <span
                        key={lang}
                        className={`paper-pill-soft ${card.chipClassName}`}
                      >
                        {resolveLanguageLabel(lang as never)} {count}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--accent-1)] transition-all group-hover:gap-2">
              View <ArrowRight size={13} />
            </div>
          </CardWrapper>
        );
      })}
    </section>
  );
}
