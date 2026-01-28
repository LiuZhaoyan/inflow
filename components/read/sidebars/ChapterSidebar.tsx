import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Chapter } from '@/lib/readerUtils';

interface ChapterSidebarProps {
  bodyChapters: Chapter[];
  selectedChapterIndex: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectChapter: (index: number) => void;
}

export function ChapterSidebar({
  bodyChapters,
  selectedChapterIndex,
  isCollapsed,
  onToggleCollapse,
  onSelectChapter,
}: ChapterSidebarProps) {
  const widthClass = isCollapsed ? 'w-12' : 'w-52';

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex shrink-0">
        <button
          onClick={onToggleCollapse}
          className="h-10 w-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50"
          title="Expand chapters"
          aria-label="Expand chapters"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <nav
      className={`hidden lg:flex bg-white border border-gray-100 shadow-sm overflow-hidden flex-col ${widthClass} rounded-2xl`}
      aria-label="Chapters"
    >
      <div className="border-b border-gray-100 bg-gray-50 flex items-center gap-2 px-3 py-3">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
          title="Collapse chapters"
          aria-label="Collapse chapters"
        >
          <PanelLeftClose size={16} />
        </button>
        <div className="text-sm font-semibold text-gray-600">Chapters</div>
      </div>

      <div className="p-2">
        {bodyChapters.length === 0 ? (
          <div className="text-sm text-gray-500 px-2 py-2">No chapters</div>
        ) : (
          <div className="flex flex-col gap-1">
            {bodyChapters.map((c, idx) => {
              const active = idx === selectedChapterIndex;
              return (
                <button
                  key={`${c.title}-${idx}`}
                  onClick={() => onSelectChapter(idx)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border
                    ${active
                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'}
                  `}
                  title={c.title}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    <span className="truncate">{c.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

interface MobileChapterListProps {
  bodyChapters: Chapter[];
  selectedChapterIndex: number;
  onSelectChapter: (index: number) => void;
}

export function MobileChapterList({
  bodyChapters,
  selectedChapterIndex,
  onSelectChapter,
}: MobileChapterListProps) {
  return (
    <nav className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-700">
        Chapters
      </div>
      <div className="p-2 max-h-64 overflow-y-auto">
        {bodyChapters.length === 0 ? (
          <div className="text-sm text-gray-500 px-2 py-2">No chapters</div>
        ) : (
          <div className="flex flex-col gap-1">
            {bodyChapters.map((c, idx) => {
              const active = idx === selectedChapterIndex;
              return (
                <button
                  key={`${c.title}-${idx}`}
                  onClick={() => onSelectChapter(idx)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border
                    ${active
                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'}
                  `}
                  title={c.title}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    <span className="truncate">{c.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
