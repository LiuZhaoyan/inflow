import { BookOpen, MessageCircle, ScrollText } from 'lucide-react';

export interface ProfileProgressEvent {
  id: string;
  date: number;
  type: 'sentence' | 'story' | 'vocabulary';
  title: string;
  detail: string;
  meta: string;
}

interface ProfileProgressLedgerProps {
  events: ProfileProgressEvent[];
}

const EVENT_STYLE = {
  sentence: { icon: MessageCircle, color: 'text-[var(--accent-1)]' },
  story: { icon: ScrollText, color: 'text-[var(--ink-1)]' },
  vocabulary: { icon: BookOpen, color: 'text-[var(--success)]' },
} as const;

export default function ProfileProgressLedger({ events }: ProfileProgressLedgerProps) {
  return (
    <section className="mb-10 rounded-[var(--radius-xl)] bg-[var(--learn-note)] p-5 sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="paper-chip text-[var(--accent-1)]">Progress Ledger</p>
          <h2 className="paper-title mt-1 text-2xl sm:text-3xl">Your learning trail</h2>
        </div>
        <span className="hidden text-xs text-[var(--ink-3)] sm:block">Latest activity</span>
      </div>

      {events.length === 0 ? (
        <p className="border-t border-[var(--learn-line)] pt-5 text-sm text-[var(--ink-3)]">
          Your learning activity will appear here.
        </p>
      ) : (
        <div className="border-t border-[var(--learn-line)]">
          {events.map((event) => {
            const style = EVENT_STYLE[event.type];
            const Icon = style.icon;
            return (
              <article key={event.id} className="grid grid-cols-[58px_1fr] gap-3 border-b border-[var(--learn-line)] py-4 last:border-b-0 sm:grid-cols-[92px_1fr_110px] sm:gap-5">
                <time className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-1)]">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </time>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={style.color} />
                    <h3 className="truncate text-sm font-semibold text-[var(--ink-0)]">{event.title}</h3>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--ink-1)]">{event.detail}</p>
                </div>
                <span className="col-start-2 text-xs text-[var(--ink-3)] sm:col-start-3 sm:self-center sm:text-right">{event.meta}</span>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
