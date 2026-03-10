import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProfileQuickLink } from './types';

interface ProfileQuickLinksProps {
  links: ProfileQuickLink[];
}

export default function ProfileQuickLinks({ links }: ProfileQuickLinksProps) {
  return (
    <section className="paper-panel-flat p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--ink-3)]">Quick Links</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="paper-panel-soft group flex items-center justify-between p-3"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--ink-0)]">{link.label}</p>
              <p className="text-xs text-[var(--ink-3)]">{link.desc}</p>
            </div>
            <ArrowRight size={14} className="text-[var(--ink-3)] transition-colors group-hover:text-[var(--accent-1)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}