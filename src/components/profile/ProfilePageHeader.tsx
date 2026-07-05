import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function ProfilePageHeader() {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <p className="paper-chip text-[var(--accent-1)]">Profile</p>
      <Link
        href="/doc"
        className="paper-btn-ghost inline-flex items-center gap-1.5 text-xs font-semibold"
      >
        Docs <ArrowRight size={12} />
      </Link>
    </div>
  );
}
