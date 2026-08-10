import Link from 'next/link';
import { resolveLanguageLabel } from '@/lib/core/language';
import type { ProfileStatCard } from './types';

interface ProfileStatsSectionProps {
  statCards: ProfileStatCard[];
}

export default function ProfileStatsSection({ statCards }: ProfileStatsSectionProps) {
  return (
    <section className="mb-10 grid grid-cols-3 border-y border-[var(--learn-line)] py-6 sm:py-7">
      {statCards.map((card) => {
        const CardWrapper = card.href.startsWith('#') ? 'a' : Link;

        return (
          <CardWrapper
            key={card.key}
            href={card.href}
            className="group min-w-0 px-1 transition-opacity hover:opacity-75 sm:border-l sm:border-[var(--learn-line)] sm:px-8 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
          >
            <p className="mb-1 truncate text-xs font-semibold text-[var(--ink-1)] sm:text-sm">{card.label}</p>
            <p className="paper-title text-3xl sm:text-4xl">{card.total}</p>

            {card.byLanguage && Object.keys(card.byLanguage).length > 0 && (
              <p className={`mt-1.5 truncate text-xs ${card.detailClassName}`}>
                {Object.entries(card.byLanguage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lang, count]) => `${resolveLanguageLabel(lang as never)} ${count}`)
                  .join(' · ')}
              </p>
            )}
          </CardWrapper>
        );
      })}
    </section>
  );
}
