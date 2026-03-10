import { Pencil } from 'lucide-react';
import type { UserProfile } from '@/lib/types/user';
import { resolveLanguageLabel } from '@/lib/language';

interface ProfileSummaryCardProps {
  profile: UserProfile | null;
  onEdit: () => void;
}

export default function ProfileSummaryCard({ profile, onEdit }: ProfileSummaryCardProps) {
  const initials = (profile?.username || '?').slice(0, 2).toUpperCase();

  return (
    <section className="paper-panel-flat relative mb-8 p-6 md:p-8">
      <button
        onClick={onEdit}
        className="paper-btn-ghost absolute top-5 right-5 min-h-0 p-2 text-[var(--ink-2)] hover:text-[var(--accent-1)]"
        title="Edit profile"
      >
        <Pencil size={18} />
      </button>

      <div className="flex items-center gap-5">
        <div className="paper-icon-well flex h-16 w-16 flex-shrink-0 rounded-full text-xl font-bold text-[var(--accent-1)] select-none">
          {initials}
        </div>

        <div className="min-w-0">
          <h2 className="paper-title truncate text-2xl">
            {profile?.username || 'Unnamed Learner'}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-2)]">
            <span>
              <span className="font-medium text-[var(--ink-1)]">Native:</span>{' '}
              {resolveLanguageLabel(profile?.nativeLanguage as never)}
            </span>
            <span>
              <span className="font-medium text-[var(--ink-1)]">Target:</span>{' '}
              {resolveLanguageLabel(profile?.targetLanguage as never)}
            </span>
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