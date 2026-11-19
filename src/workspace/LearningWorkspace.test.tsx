import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LocaleProvider } from '@/i18n/context';
import type { DesktopBridge, LearningArtifact, VocabularyEntry } from '@/listening/desktop';
import LearningWorkspace from './LearningWorkspace';

const words: VocabularyEntry[] = [
  { id: 'home', language: 'en', lemma: 'home', meaningZh: '家', selected: true, contexts: [{
    id: 'home-context', surface: 'home', sentence: 'I walk home.',
    source: { type: 'artifact', artifactId: 'pending-story', sentenceIndex: 0, name: 'Pending story' },
  }] },
  { id: 'walk', language: 'en', lemma: 'walk', meaningZh: '步行', selected: true, contexts: [] },
];
const currentStory: LearningArtifact = {
  id: 'current-story', title: 'Current story', language: 'en', createdAt: '2026-10-20T00:00:00Z',
  elapsedMs: 1, requestedModel: 'deepseek-flash', targets: [{ id: 'walk', lemma: 'walk', meaningZh: '步行' }],
  sentences: [{ parts: [{ text: 'I walk home.', targetId: null }], translationZh: '我走回家。' }],
};
const pendingStory: LearningArtifact = { ...currentStory, id: 'pending-story', title: 'Pending story' };
const dialogMethods = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
};

function createHost() {
  return {
    restore: vi.fn().mockResolvedValue(null), list: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({ videoMaskColor: '#000000', interfaceLocale: 'en' }),
    credentialStatus: vi.fn().mockResolvedValue({ configured: false }),
    listVocabulary: vi.fn().mockResolvedValue(words),
    selectVocabulary: vi.fn().mockImplementation(async ids => ids),
    saveVocabulary: vi.fn().mockResolvedValue({ ...words[0], note: 'Personal reminder' }),
    listArtifacts: vi.fn().mockResolvedValue([currentStory, pendingStory]),
    restoreArtifact: vi.fn().mockResolvedValue(currentStory),
    listArtifactVocabulary: vi.fn().mockResolvedValue([]),
    openArtifact: vi.fn<DesktopBridge['openArtifact']>(),
    acceptArtifact: vi.fn<DesktopBridge['acceptArtifact']>(),
  };
}

let host: ReturnType<typeof createHost>;

beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); } },
  });
  host = createHost();
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  await screen.findByRole('heading', { name: 'home' });
});

afterEach(() => {
  cleanup();
  delete window.inflow;
  vi.unstubAllGlobals();
  for (const [name, descriptor] of Object.entries(dialogMethods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

test('saving a notebook note preserves both selected words in the real generation preview', async () => {
  async function openPreview() {
    fireEvent.click(screen.getByRole('button', { name: 'Generate story' }));
    const targets = await screen.findByRole('dialog', { name: 'Choose story vocabulary' });
    expect(within(targets).getAllByRole('checkbox').map(input => (input as HTMLInputElement).checked)).toEqual([true, true]);
    fireEvent.click(within(targets).getByRole('button', { name: 'Continue' }));
    const dialog = await screen.findByRole('dialog', { name: 'Generate a story' });
    const preview = within(dialog).getByRole('region', { name: 'Selected vocabulary' });
    expect(within(preview).getAllByRole('listitem')).toHaveLength(2);
    expect(within(preview).getByText('home')).toBeDefined();
    expect(within(preview).getByText('walk')).toBeDefined();
    return dialog;
  }

  const dialog = await openPreview();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close generation dialog' }));
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  fireEvent.click(screen.getByText(/^Notes/));
  fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Personal reminder' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save note' })); });
  expect((screen.getByRole('button', { name: 'Generate story' }) as HTMLButtonElement).disabled).toBe(false);
  expect(host.saveVocabulary).toHaveBeenCalledWith(expect.objectContaining({ id: 'home', note: 'Personal reminder' }));
  expect(within(dialog).getAllByRole('listitem', { hidden: true })).toHaveLength(2);
  host.listVocabulary.mockResolvedValue([{ ...words[0], note: 'Personal reminder' }, words[1]]);

  await openPreview();
});

test.each(['save', 'discard'] as const)('editing a notebook draft cancels pending Story navigation even after %s', async action => {
  let release!: (artifact: LearningArtifact) => void;
  const pending = new Promise<LearningArtifact>(resolve => { release = resolve; });
  host.openArtifact.mockReturnValueOnce(pending);
  fireEvent.click(screen.getByRole('button', { name: 'Open Pending story at Sentence 1' }));
  expect(host.openArtifact).toHaveBeenCalledWith(pendingStory.id);
  fireEvent.click(screen.getByText(/^Notes/));
  fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Personal reminder' } });
  expect(screen.getByRole('status').textContent).toContain('Story navigation canceled');

  if (action === 'save') {
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save note' }) as HTMLButtonElement).disabled).toBe(true));
    expect(host.saveVocabulary).toHaveBeenCalledWith(expect.objectContaining({ note: 'Personal reminder' }));
  } else {
    const notes = screen.getByRole('textbox', { name: 'Personal note' }).closest('details')!;
    fireEvent.click(within(notes).getByRole('button', { name: 'Cancel' }));
    expect((screen.getByRole('textbox', { name: 'Personal note' }) as HTMLTextAreaElement).value).toBe('');
    expect(host.saveVocabulary).not.toHaveBeenCalled();
  }
  await act(async () => { release(pendingStory); await pending; });

  expect(host.acceptArtifact).not.toHaveBeenCalled();
  expect(document.querySelector<HTMLElement>('.story-sentences')?.dataset.artifactId).toBe(currentStory.id);
  expect(screen.getByRole('region', { name: 'Vocab workspace' })).toBeDefined();
});
