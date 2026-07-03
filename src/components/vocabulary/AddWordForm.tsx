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
    <div className="paper-card p-6 reveal-up relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-8 w-8 inline-flex items-center justify-center rounded-full border border-[var(--line-0)] bg-[#faf5ff] text-[var(--ink-2)] hover:text-[var(--accent-1)]"
      >
        <X className="w-5 h-5" />
      </button>

      <h3 className="paper-title text-xl mb-4 flex items-center gap-2">
        <div className="w-1 h-5 bg-[var(--accent-0)] rounded-full"></div>
        New Flashcard
      </h3>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-2)] uppercase tracking-wide">Target Word</label>
            <input
              type="text"
              placeholder="e.g. Serendipity"
              className="paper-input"
              value={newWord}
              onChange={(e) => onChangeWord(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--ink-2)] uppercase tracking-wide">Definition (Optional)</label>
            <input
              type="text"
              placeholder="Meaning in context..."
              className="paper-input"
              value={newDefinition}
              onChange={(e) => onChangeDefinition(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-start pt-2">
          <button
            type="submit"
            disabled={addingStatus !== 'idle'}
            className="paper-btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
