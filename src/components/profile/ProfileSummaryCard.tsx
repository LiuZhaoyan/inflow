import type { UserProfile } from '@/lib/types/user';
import { resolveLanguageLabel } from '@/lib/core/language';

interface ProfileSummaryCardProps {
  profile: UserProfile | null;
  onEdit: () => void;
}

export default function ProfileSummaryCard({ profile, onEdit }: ProfileSummaryCardProps) {
  const initials = (profile?.username || '?').slice(0, 2).toUpperCase();

  return (
    <section className="mb-10 flex flex-col items-center text-center">
      <div className="flex flex-col items-center">
        <div className="paper-icon-well flex h-20 w-20 flex-shrink-0 rounded-full text-xl font-bold text-[var(--accent-1)] select-none">
          {initials}
        </div>

        <div className="mt-4 min-w-0">
          <h2 className="paper-title truncate text-3xl">
            {profile?.username || 'Unnamed Learner'}
          </h2>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[var(--ink-2)]">
            <span>
              <span className="font-medium text-[var(--ink-1)]">Native:</span>{' '}
              {resolveLanguageLabel(profile?.nativeLanguage as never)}
            </span>
            <span>
              <span className="font-medium text-[var(--ink-1)]">Target:</span>{' '}
              {resolveLanguageLabel(profile?.targetLanguage as never)}
            </span>
            <button
              onClick={onEdit}
              className="text-xs font-semibold text-[var(--accent-1)] transition-colors hover:text-[var(--accent-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Edit profile
            </button>
          </div>

          {profile?.createdAt && (
            <p className="mt-1.5 text-xs text-[var(--ink-3)]">
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
