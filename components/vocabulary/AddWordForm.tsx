import type { FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';

interface AddWordFormProps {
  isOpen: boolean;
  newWord: string;
  newDefinition: string;
  addingStatus: 'idle' | 'saving';
  onChangeWord: (value: string) => void;
  onChangeDefinition: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

export default function AddWordForm({
  isOpen,
  newWord,
  newDefinition,
  addingStatus,
  onChangeWord,
  onChangeDefinition,
  onSubmit,
  onClose,
}: AddWordFormProps) {
  if (!isOpen) return null;

  return (
    <div className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
      >
        <X className="w-5 h-5" />
      </button>

      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
        New Flashcard
      </h3>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Word</label>
            <input
              type="text"
              placeholder="e.g. Serendipity"
              className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={newWord}
              onChange={(e) => onChangeWord(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Definition (Optional)</label>
            <input
              type="text"
              placeholder="Meaning in context..."
              className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={newDefinition}
              onChange={(e) => onChangeDefinition(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-start pt-2">
          <button
            type="submit"
            disabled={addingStatus !== 'idle'}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
          >
            {addingStatus === 'idle' && 'Create Card'}
            {addingStatus === 'saving' && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
