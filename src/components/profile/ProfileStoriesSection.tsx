import Link from 'next/link';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import type { Story } from '@/lib/types/story';
import ProfileStoryCard from './ProfileStoryCard';

interface ProfileStoriesSectionProps {
  stories: Story[];
  storiesExpanded: boolean;
  expandedStoryId: string | null;
  onToggleExpanded: () => void;
  onToggleStory: (id: string) => void;
  onDeleteStory: (id: string) => void;
}

export default function ProfileStoriesSection({
  stories,
  storiesExpanded,
  expandedStoryId,
  onToggleExpanded,
  onToggleStory,
  onDeleteStory,
}: ProfileStoriesSectionProps) {
  return (
    <section id="stories" className="mb-10">
      <button onClick={onToggleExpanded} className="flex w-full items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--accent-1)]">
          <ScrollText size={16} className="text-[var(--accent-1)]" />
          Your Stories
          {stories.length > 0 && (
            <span className="text-xs font-semibold normal-case text-[var(--ink-3)]">
              {stories.length}
            </span>
          )}
        </h3>
        {storiesExpanded ? (
          <ChevronUp size={16} className="text-[var(--ink-3)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--ink-3)]" />
        )}
      </button>

      {storiesExpanded && (
        <div className="mt-4 space-y-3">
          {stories.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--ink-3)]">
              No stories yet. Go to{' '}
              <Link href="/vocabulary" className="text-[var(--accent-1)] hover:underline">
                Vocabulary
              </Link>{' '}
              to generate your first story.
            </p>
          ) : (
            stories.map((story) => (
              <ProfileStoryCard
                key={story.id}
                story={story}
                isExpanded={expandedStoryId === story.id}
                onToggle={() => onToggleStory(story.id)}
                onDelete={() => onDeleteStory(story.id)}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
