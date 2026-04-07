import { Loader2, X } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/lib/core/language';
import type { ProfileFormState } from './types';

interface EditProfileModalProps {
  form: ProfileFormState;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (field: keyof ProfileFormState, value: string) => void;
}

export default function EditProfileModal({
  form,
  saving,
  saveError,
  onClose,
  onSubmit,
  onFieldChange,
}: EditProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="paper-panel-flat mx-4 w-full max-w-lg rounded-[var(--radius-lg)] p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="paper-chip text-[var(--accent-1)]">Profile</p>
            <h2 className="paper-title mt-1 text-2xl">Edit your profile</h2>
          </div>
          <button onClick={onClose} className="paper-btn-ghost min-h-0 p-1.5 text-[var(--ink-2)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(event) => onFieldChange('username', event.target.value)}
              placeholder="e.g. Lina"
              className="paper-input mt-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">
                Native Language
              </label>
              <select
                value={form.nativeLanguage}
                onChange={(event) => onFieldChange('nativeLanguage', event.target.value)}
                className="paper-input mt-2"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={`native-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">
                Target Language
              </label>
              <select
                value={form.targetLanguage}
                onChange={(event) => onFieldChange('targetLanguage', event.target.value)}
                className="paper-input mt-2"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={`target-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveError && (
            <div className="paper-alert-soft-danger px-3 py-2 text-sm">
              {saveError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="paper-btn-ghost flex-1 text-sm font-semibold text-[var(--ink-1)]"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="paper-btn-primary flex-1">
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}