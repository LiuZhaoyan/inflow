import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';

export default function ProfileLoadingState() {
  return (
    <div className="page-surface page-surface-operation text-[var(--foreground)] font-sans">
      <Header showProfile={false} />
      <main className="flex items-center justify-center pt-40">
        <div className="paper-card-soft flex items-center gap-3 px-5 py-4">
          <Loader2 className="animate-spin text-[var(--accent-1)]" size={22} />
          <span className="text-sm font-semibold text-[var(--ink-2)]">Loading profile</span>
        </div>
      </main>
    </div>
  );
}