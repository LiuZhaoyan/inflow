import { Loader2, Wand2, X } from 'lucide-react';

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
        className={`fixed right-0 top-24 z-40 bg-white border-l border-gray-200 shadow-lg rounded-l-2xl p-4 sm:w-[290px] w-[80vw] h-[calc(100vh-7rem)] overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-indigo-900">
            <Wand2 className="text-indigo-600" size={18} />
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
      </aside>
    </>
  );
}
