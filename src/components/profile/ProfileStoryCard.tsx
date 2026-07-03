import { Trash2 } from 'lucide-react';
import type { Story } from '@/lib/types/story';
import { resolveLanguageLabel } from '@/lib/core/language';

interface ProfileStoryCardProps {
  story: Story;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function highlightStoryText(content: string) {
  return content.replace(
    /\*\*(.*?)\*\*/g,
    '<span class="text-[var(--accent-1)] bg-[rgba(147,51,234,0.1)] px-1 py-0.5 rounded font-bold">$1</span>'
  );
}

export default function ProfileStoryCard({ story, isExpanded, onToggle, onDelete }: ProfileStoryCardProps) {
  return (
    <div className="paper-panel-soft group p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs text-[var(--ink-3)]">
              {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {story.language && (
              <span className="paper-pill-soft paper-pill-ink text-[10px] font-medium">
                {resolveLanguageLabel(story.language as never)}
              </span>
            )}
          </div>

          <div className="mb-2 flex flex-wrap gap-1">
            {story.words.map((word, index) => (
              <span
                key={`${story.id}-${index}`}
                className="paper-pill-soft paper-pill-accent text-xs font-medium"
              >
                {word}
              </span>
            ))}
          </div>

          {isExpanded ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Story</p>
                <div
                  className="prose prose-sm max-w-none leading-relaxed text-[var(--ink-1)]"
                  dangerouslySetInnerHTML={{ __html: highlightStoryText(story.content) }}
                />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Translation</p>
                {story.translation ? (
                  <div
                    className="prose prose-sm max-w-none leading-relaxed text-[var(--ink-1)]"
                    dangerouslySetInnerHTML={{ __html: highlightStoryText(story.translation) }}
                  />
                ) : (
                  <p className="text-xs text-[var(--ink-3)]">No translation yet.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="line-clamp-2 text-sm text-[var(--ink-2)]">
              {story.content.replace(/\*\*/g, '').slice(0, 150)}
              {story.content.length > 150 ? '…' : ''}
            </p>
          )}
        </div>

        <button
          onClick={onDelete}
          className="flex-shrink-0 rounded-lg p-1.5 text-[var(--ink-3)] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[rgba(220,38,38,0.08)] hover:text-[var(--danger)]"
          title="Delete story"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}