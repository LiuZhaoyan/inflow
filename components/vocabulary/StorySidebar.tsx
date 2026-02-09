import { Loader2, Wand2, X, GripHorizontal } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

interface StorySidebarProps {
  isOpen: boolean;
  story: string | null;
  isGeneratingStory: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function StorySidebar({
  isOpen,
  story,
  isGeneratingStory,
  onToggle,
  onClose,
}: StorySidebarProps) {
  const [height, setHeight] = useState(200);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

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
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white border border-gray-200 shadow-sm rounded-l-full px-3 py-2 text-sm text-gray-700 hover:text-indigo-700 hover:border-indigo-300"
        title={isOpen ? 'Hide Story' : 'Show Story'}
      >
        <span className="inline-flex items-center gap-1">
          <Wand2 className="w-4 h-4 text-indigo-600" />
          Story
        </span>
      </button>

      <aside
        className={`fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-lg rounded-t-2xl m-0 overflow-hidden transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height }}
        aria-hidden={!isOpen}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <GripHorizontal className="w-5 h-5 text-gray-400" />
        </div>

        <div className="px-6 pt-5 pb-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-indigo-900">
              Generated Story
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 rounded-lg p-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isGeneratingStory ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </div>
          ) : story ? (
            <div
              className="prose prose-indigo max-w-none text-gray-800 leading-relaxed font-medium"
              dangerouslySetInnerHTML={{
                __html: story.replace(
                  /\*\*(.*?)\*\*/g,
                  '<span class="text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-bold mx-0.5 shadow-sm border border-indigo-200">$1</span>'
                ),
              }}
            />
          ) : (
            <div className="text-sm text-gray-500">No story yet. Select words and click Generate Story.</div>
          )}
        </div>
      </aside>
    </>
  );
}
