import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { resolveLanguageLabel } from '@/lib/language';
import type { ProfileStatCard } from './types';

interface ProfileStatsSectionProps {
  statCards: ProfileStatCard[];
}

export default function ProfileStatsSection({ statCards }: ProfileStatsSectionProps) {
  return (
    <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {statCards.map((card) => {
        const CardWrapper = card.href.startsWith('#') ? 'a' : Link;

        return (
          <CardWrapper
            key={card.key}
            href={card.href}
            className="group flex flex-col justify-between rounded-[var(--radius-md)] bg-[var(--paper-note-strong)] p-5 hover:-translate-y-0.5"
          >
            <div>
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--paper-1)] ${card.iconClassName}`}>
                {card.icon}
              </div>

              <p className="mb-1 text-sm font-medium text-[var(--ink-2)]">{card.label}</p>
              <p className="paper-title text-3xl">{card.total}</p>

              {card.byLanguage && Object.keys(card.byLanguage).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(card.byLanguage)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, count]) => (
                      <span
                        key={lang}
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${card.chipClassName}`}
                      >
                        {resolveLanguageLabel(lang as never)} {count}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--accent-1)] transition-all group-hover:gap-2">
              View <ArrowRight size={14} />
            </div>
          </CardWrapper>
        );
      })}
    </section>
  );
}