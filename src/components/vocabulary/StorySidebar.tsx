import { Loader2, Wand2, X, GripHorizontal, Trash2, Clock, Volume2 } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { resolveLanguageLabel } from '@/lib/core/language';
import type { Story } from '@/lib/types/story';

interface StorySidebarProps {
  isOpen: boolean;
  story: string | null;
  translation: string | null;
  stories: Story[];
  activeStoryId: string | null;
  isGeneratingStory: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectStory: (story: Story) => void;
  onDeleteStory: (id: string) => void;
  onUpdateStoryAudio?: (id: string, audioPath: string) => void;
}

export default function StorySidebar({
  isOpen,
  story,
  translation,
  stories,
  activeStoryId,
  isGeneratingStory,
  onToggle,
  onClose,
  onSelectStory,
  onDeleteStory,
  onUpdateStoryAudio,
}: StorySidebarProps) {
  const [height, setHeight] = useState(280);
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [playing, setPlaying] = useState(false);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const activeStory = activeStoryId
    ? stories.find(s => s.id === activeStoryId)
    : (story ? stories.find(s => s.content === story) : undefined);

  const handlePlayStoryAudio = useCallback(async () => {
    if (playing || !story) return;
    const storyText = story.replace(/\*\*/g, '').trim();
    if (!storyText) return;
    const storyId = activeStory?.id;
    if (!storyId) return;

    let url = activeStory?.audioPath;
    setPlaying(true);
    try {
      if (!url) {
        const res = await fetch('/api/ai-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: storyText, stream: false })
        });
        if (!res.ok) throw new Error('TTS failed');
        const data = await res.json();
        url = data.url || '';
        if (url) {
          const putRes = await fetch('/api/stories', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: storyId, audioPath: url })
          });
          if (putRes.ok) {
            onUpdateStoryAudio?.(storyId, url);
          }
        }
      }

      if (!url) throw new Error('Missing audio url');
      const audio = new Audio(url);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      await audio.play();
    } catch (err) {
      console.error('Play story audio failed', err);
      setPlaying(false);
    }
  }, [activeStory?.audioPath, activeStory?.id, onUpdateStoryAudio, playing, story]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(90, Math.min(window.innerHeight - 100, startHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height]);

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white border border-[var(--line-0)] shadow-sm rounded-l-full px-3 py-2 text-sm text-[var(--ink-2)] hover:text-[var(--accent-1)] hover:border-[var(--line-1)]"
        title={isOpen ? 'Hide Story' : 'Show Story'}
      >
        <span className="inline-flex items-center gap-1">
          <Wand2 className="w-4 h-4 text-[var(--accent-1)]" />
          Story
        </span>
      </button>

      <aside
        className={`fixed inset-x-0 bottom-0 z-40 bg-white border-t border-[var(--line-0)] shadow-lg rounded-t-2xl m-0 overflow-hidden transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height }}
        aria-hidden={!isOpen}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center hover:bg-[#ede9fe] transition-colors"
        >
          <GripHorizontal className="w-5 h-5 text-[var(--ink-2)]" />
        </div>

        <div className="px-6 pt-5 pb-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTab('current')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  tab === 'current'
                    ? 'bg-[#ede9fe] text-[var(--accent-1)]'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:bg-[#f3f0ff]'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => setTab('history')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                  tab === 'history'
                    ? 'bg-[#ede9fe] text-[var(--accent-1)]'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:bg-[#f3f0ff]'
                }`}
              >
                <Clock size={14} />
                History
                {stories.length > 0 && (
                  <span className="ml-0.5 text-xs bg-[#ddd6fe] text-[var(--ink-2)] rounded-full px-1.5 py-0.5 leading-none">
                    {stories.length}
                  </span>
                )}
              </button>
              <button
                onClick={handlePlayStoryAudio}
                disabled={!story || isGeneratingStory || !activeStory?.id}
                className={`p-2 rounded-full hover:bg-[#ede9fe] text-[var(--accent-1)] transition-all ${playing ? 'animate-pulse opacity-50' : 'opacity-80 hover:opacity-100'} disabled:opacity-40 disabled:cursor-not-allowed`}
                title="Play story audio"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--ink-2)] hover:text-[var(--accent-1)] rounded-lg p-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tab === 'current' ? (
            <>
              {isGeneratingStory ? (
                <div className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </div>
              ) : story ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--ink-2)] font-semibold mb-2">Story</p>
                    <div
                      className="prose max-w-none text-[var(--ink-1)] leading-relaxed font-medium"
                      dangerouslySetInnerHTML={{
                        __html: story.replace(
                          /\*\*(.*?)\*\*/g,
                          '<span class="text-[#9333ea] bg-purple-100 px-1.5 py-0.5 rounded font-bold mx-0.5 border border-purple-200">$1</span>'
                        ),
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--ink-2)] font-semibold mb-2">Translation</p>
                    {translation ? (
                      <div
                        className="prose max-w-none text-[var(--ink-1)] leading-relaxed font-medium"
                        dangerouslySetInnerHTML={{
                          __html: translation.replace(
                            /\*\*(.*?)\*\*/g,
                            '<span class="text-[#9333ea] bg-purple-100 px-1.5 py-0.5 rounded font-bold mx-0.5 border border-purple-200">$1</span>'
                          ),
                        }}
                      />
                    ) : (
                      <div className="text-sm text-[var(--ink-2)]">No translation yet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[var(--ink-2)]">No story yet. Select words and click Generate Story.</div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {stories.length === 0 ? (
                <div className="text-sm text-[var(--ink-2)]">No stories saved yet.</div>
              ) : (
                stories.map(s => (
                  <div
                    key={s.id}
                    className="group bg-[#faf5ff] border border-[var(--line-0)] rounded-xl p-3 hover:border-[var(--line-1)] hover:bg-[#f3f0ff] transition-colors cursor-pointer"
                    onClick={() => { onSelectStory(s); setTab('current'); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--ink-2)] mb-1 flex items-center gap-2">
                          <span>{new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {s.language && (
                            <span className="bg-[#ddd6fe] text-[var(--ink-2)] rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                              {resolveLanguageLabel(s.language)}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--ink-1)] line-clamp-2 leading-snug">
                          {s.content.replace(/\*\*/g, '').slice(0, 120)}
                          {s.content.length > 120 ? '…' : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.words.slice(0, 5).map((w, i) => (
                            <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-[#9333ea]">
                              {w}
                            </span>
                          ))}
                          {s.words.length > 5 && (
                            <span className="text-[10px] text-[var(--ink-2)]">+{s.words.length - 5}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteStory(s.id); }}
                        className="p-1 rounded-lg text-[var(--ink-2)] hover:text-[var(--danger)] hover:bg-[#fee2e2] transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete story"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
