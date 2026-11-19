import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LocaleProvider } from '@/i18n/context';
import type { DesktopBridge, SavedMedia, VocabularyEntry } from '@/listening/desktop';
import LearningWorkspace from '@/workspace/LearningWorkspace';

const first: SavedMedia = {
  id: 'first', name: 'First.wav', language: 'en', video: false, missing: false,
  segments: [{ id: 'first-sentence', start: 0, end: 3, text: 'Hello world.', groups: ['Hello', ' world.'] }],
  learning: { position: 0, index: 0, rate: 1, loop: false, duration: 3, mode: 'full' },
};
const second: SavedMedia = { ...first, id: 'second', name: 'Second.wav', segments: [{ ...first.segments[0], id: 'second-sentence' }] };
const word: VocabularyEntry = { id: 'word', language: 'en', lemma: 'hello', meaningZh: '你好', selected: false, contexts: [{
  id: 'context', surface: 'Hello', sentence: 'Hello world.',
  source: { type: 'media', mediaId: second.id, segmentId: second.segments[0].id, name: second.name, start: 0 },
}] };

const dialogs = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
};

function createHost(locale: 'en' | 'zh-CN' = 'en', restored = first) {
  return {
    restore: vi.fn().mockResolvedValue(restored), list: vi.fn().mockResolvedValue([first, second]),
    getSettings: vi.fn().mockResolvedValue({ videoMaskColor: '#000000', interfaceLocale: locale }),
    credentialStatus: vi.fn().mockResolvedValue({ configured: false }),
    listVocabulary: vi.fn().mockResolvedValue([word]),
    saveVocabulary: vi.fn().mockResolvedValue({ ...word, note: 'Draft note' }),
    listArtifacts: vi.fn().mockResolvedValue([]), restoreArtifact: vi.fn().mockResolvedValue(null),
    saveLearning: vi.fn().mockResolvedValue(undefined), cancel: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(second), readMedia: vi.fn().mockResolvedValue(second),
    acceptMedia: vi.fn((id: string) => id === first.id ? first : second),
    chooseImportMedia: vi.fn().mockResolvedValue('ticket'), importMedia: vi.fn(), cancelImportMedia: vi.fn().mockResolvedValue(undefined),
    relink: vi.fn(),
    transcribe: vi.fn().mockResolvedValue({ ...first, segments: [{ ...first.segments[0], id: 'replacement', text: 'New words.', groups: ['New', ' words.'] }] }),
  };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value() {} });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); } },
  });
});

afterEach(() => {
  cleanup(); delete window.inflow; vi.restoreAllMocks(); vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  for (const [name, descriptor] of Object.entries(dialogs)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

async function mount(host: ReturnType<typeof createHost>) {
  window.inflow = host as unknown as DesktopBridge;
  const rendered = render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  await waitFor(() => expect(rendered.container.querySelector('audio')).not.toBeNull());
  const audio = rendered.container.querySelector('audio')!;
  Object.defineProperty(audio, 'duration', { configurable: true, value: 3 });
  fireEvent.loadedMetadata(audio);
  return rendered;
}

test.each([
  ['en', 'Process again', /vocabulary.*links.*positions/i, /cached translations/i, /group masks/i, /words.*notes.*kept/i],
  ['zh-CN', '重新处理', /词汇.*关联.*位置/, /缓存.*翻译/, /意群.*遮罩/, /词汇.*笔记.*保留/],
] as const)('replacing a transcript requires a complete %s confirmation', async (locale, label, links, translations, masks, preserved) => {
  const host = createHost(locale);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await mount(host);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  expect(confirm).toHaveBeenCalledOnce();
  const message = confirm.mock.calls[0][0] as string;
  for (const expected of [links, translations, masks, preserved]) expect(message).toMatch(expected);
  expect(host.transcribe).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: label }));
  await waitFor(() => expect(host.transcribe).toHaveBeenCalledOnce());
});

test('a failed library refresh after transcription can retry the list without retranscribing', async () => {
  const host = createHost();
  host.list.mockResolvedValueOnce([first, second]).mockRejectedValueOnce(new Error('Library unavailable Bearer fixture-secret sk-1234567890abcdef')).mockResolvedValueOnce([first, second]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Process again' }));
  await waitFor(() => expect(host.list).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('button', { name: 'Retry processing' })).toBeNull();
  const notice = await screen.findByRole('alert');
  expect(notice.textContent).toContain('Library unavailable');
  expect(notice.textContent).not.toMatch(/fixture-secret|sk-1234567890abcdef/);
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Retry loading library' }));
  await waitFor(() => expect(host.list).toHaveBeenCalledTimes(3));
  expect(host.transcribe).toHaveBeenCalledOnce();
});

test('first processing starts automatically after an import without confirmation', async () => {
  const host = createHost();
  const imported: SavedMedia = { ...second, id: 'new', name: 'New.wav', segments: [] };
  host.importMedia.mockResolvedValue(imported);
  host.acceptMedia.mockReturnValue(imported);
  host.transcribe.mockResolvedValue({ ...imported, segments: second.segments });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const rendered = await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
  const dialog = await screen.findByRole('dialog', { name: 'Choose source language' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'English' }));
  await waitFor(() => expect(host.acceptMedia).toHaveBeenCalledWith(imported.id, undefined));
  expect(host.importMedia).toHaveBeenCalledWith('ticket', 'en', false);
  const audio = rendered.container.querySelector('audio')!;
  fireEvent.loadedMetadata(audio);
  await waitFor(() => expect(host.transcribe).toHaveBeenCalledWith(imported.id, expect.any(String)));
  expect(confirm).not.toHaveBeenCalled();
});

test.each(['pending', 'accepted'] as const)('startup restore cannot replace a %s import or its library entry', async phase => {
  const host = createHost();
  const imported: SavedMedia = { ...second, id: 'new', name: 'New.wav', segments: [] };
  let restore!: (media: SavedMedia) => void;
  let finishImport!: (media: SavedMedia) => void;
  const restoring = new Promise<SavedMedia>(resolve => { restore = resolve; });
  const importing = new Promise<SavedMedia>(resolve => { finishImport = resolve; });
  host.restore.mockReturnValueOnce(restoring);
  host.importMedia.mockReturnValueOnce(importing);
  host.acceptMedia.mockReturnValue(imported);
  host.list.mockResolvedValueOnce([first, second]).mockResolvedValueOnce([first, second, imported]);
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
  fireEvent.click(within(await screen.findByRole('dialog', { name: 'Choose source language' })).getByRole('button', { name: 'English' }));
  if (phase === 'accepted') {
    await act(async () => { finishImport(imported); await importing; });
    await waitFor(() => expect(host.acceptMedia).toHaveBeenCalledOnce());
  }
  await act(async () => { restore(first); await restoring; });
  if (phase === 'pending') expect(screen.getByRole('img', { name: 'Audio: First.wav' })).toBeDefined();
  else expect(screen.queryByRole('img', { name: 'Audio: First.wav' })).toBeNull();
  if (phase === 'pending') await act(async () => { finishImport(imported); await importing; });
  expect(await screen.findByRole('img', { name: 'Audio: New.wav' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  expect(screen.getByRole('button', { name: /New.wav/ })).toBeDefined();
});

test.each([
  ['picker', 'before'], ['picker', 'after'], ['language', 'before'], ['language', 'after'],
] as const)('startup restore survives %s cancellation when it arrives %s the cancellation', async (stage, order) => {
  const host = createHost();
  let restore!: (media: SavedMedia) => void;
  const restoring = new Promise<SavedMedia>(resolve => { restore = resolve; });
  let cancelPicker!: (ticket: string | null) => void;
  const choosing = new Promise<string | null>(resolve => { cancelPicker = resolve; });
  host.restore.mockReturnValueOnce(restoring);
  if (stage === 'picker') host.chooseImportMedia.mockReturnValueOnce(choosing);
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
  const dialog = stage === 'language' ? await screen.findByRole('dialog', { name: 'Choose source language' }) : null;
  if (order === 'before') await act(async () => { restore(first); await restoring; });
  if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Close language selection' }));
  else await act(async () => { cancelPicker(null); await choosing; });
  if (order === 'after') await act(async () => { restore(first); await restoring; });
  expect(await screen.findByRole('img', { name: 'Audio: First.wav' })).toBeDefined();
  expect(host.acceptMedia).not.toHaveBeenCalled();
});

test.each([
  ['import', 'before'], ['import', 'after'], ['read', 'before'], ['read', 'after'], ['accept', 'before'], ['accept', 'after'],
] as const)('startup restore survives a failed %s when it arrives %s the failure', async (stage, order) => {
  const host = createHost();
  let restore!: (media: SavedMedia) => void;
  const restoring = new Promise<SavedMedia>(resolve => { restore = resolve; });
  let finish!: (media: SavedMedia) => void;
  let fail!: (error: Error) => void;
  const pending = new Promise<SavedMedia>((resolve, reject) => { finish = resolve; fail = reject; });
  host.restore.mockReturnValueOnce(restoring);
  if (stage === 'import') host.importMedia.mockReturnValueOnce(pending);
  else host.readMedia.mockReturnValueOnce(pending);
  if (stage === 'accept') host.acceptMedia.mockImplementation(() => { throw new Error('Fixture accept failure'); });
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  if (stage === 'import') {
    fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Choose source language' })).getByRole('button', { name: 'English' }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'Library' }));
    fireEvent.click(await screen.findByRole('button', { name: /Second.wav/ }));
  }
  if (order === 'before') await act(async () => { restore(first); await restoring; });
  await act(async () => { if (stage === 'accept') finish(second); else fail(new Error(`Fixture ${stage} failure`)); await pending.catch(() => {}); });
  expect((await screen.findByRole('alert')).textContent).toContain(`Fixture ${stage} failure`);
  if (order === 'after') await act(async () => { restore(first); await restoring; });
  expect(await screen.findByRole('img', { name: 'Audio: First.wav' })).toBeDefined();
  expect(screen.getByRole('alert').textContent).toContain(`Fixture ${stage} failure`);
});

test('a stale initial library failure cannot replace a newer successful refresh', async () => {
  const host = createHost();
  const imported: SavedMedia = { ...second, id: 'new', name: 'New.wav', segments: [] };
  let failInitial!: (error: Error) => void;
  const initial = new Promise<SavedMedia[]>((_, reject) => { failInitial = reject; });
  host.list.mockReturnValueOnce(initial).mockResolvedValueOnce([first, second, imported]);
  host.importMedia.mockResolvedValue(imported);
  host.acceptMedia.mockReturnValue(imported);
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><LearningWorkspace/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
  fireEvent.click(within(await screen.findByRole('dialog', { name: 'Choose source language' })).getByRole('button', { name: 'English' }));
  await waitFor(() => expect(host.list).toHaveBeenCalledTimes(2));
  await act(async () => { failInitial(new Error('Stale library failure')); await initial.catch(() => {}); });
  expect(screen.queryByText(/Stale library failure/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  expect(screen.getByRole('button', { name: /New.wav/ })).toBeDefined();
});

test('a later library selection supersedes a pending media source', async () => {
  const host = createHost();
  const third: SavedMedia = { ...second, id: 'third', name: 'Third.wav' };
  host.list.mockResolvedValue([first, second, third]);
  host.acceptMedia.mockImplementation(id => id === third.id ? third : second);
  let release!: (media: SavedMedia) => void;
  const pending = new Promise<SavedMedia>(resolve => { release = resolve; });
  host.readMedia.mockReturnValueOnce(pending).mockResolvedValueOnce(third);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  await screen.findByRole('heading', { name: 'hello' });
  fireEvent.click(screen.getByRole('button', { name: 'Open Second.wav at 0:00' }));
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(screen.getByRole('button', { name: /Third.wav/ }));
  await waitFor(() => expect(host.acceptMedia).toHaveBeenCalledWith(third.id, undefined));
  await act(async () => { release(second); await pending; });
  expect(host.acceptMedia).toHaveBeenCalledTimes(1);
});

test('an older library retry cannot overwrite a newer successful refresh', async () => {
  const host = createHost();
  const third: SavedMedia = { ...second, id: 'third', name: 'Third.wav' };
  let failOld!: (failure: Error) => void;
  let finishNew!: (items: SavedMedia[]) => void;
  const old = new Promise<SavedMedia[]>((_, reject) => { failOld = reject; });
  const latest = new Promise<SavedMedia[]>(resolve => { finishNew = resolve; });
  host.list.mockResolvedValueOnce([first, second]).mockRejectedValueOnce(new Error('Library unavailable'))
    .mockReturnValueOnce(old).mockReturnValueOnce(latest);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Process again' }));
  await waitFor(() => expect(host.list).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  const retry = await screen.findByRole('button', { name: 'Retry loading library' });
  fireEvent.click(retry); fireEvent.click(retry);
  await act(async () => { finishNew([first, third]); await latest; });
  await act(async () => { failOld(new Error('Outdated error')); await old.catch(() => {}); });
  expect(screen.getByRole('button', { name: /Third.wav/ })).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Retry loading library' })).toBeNull();
});

test('an import completed after a note edit stays in the library without selecting it', async () => {
  const host = createHost();
  const imported: SavedMedia = { ...second, id: 'new', name: 'New.wav', segments: [] };
  let release!: (media: SavedMedia) => void;
  const pending = new Promise<SavedMedia>(resolve => { release = resolve; });
  host.importMedia.mockReturnValueOnce(pending);
  host.list.mockResolvedValueOnce([first, second]).mockResolvedValueOnce([first, second, imported]);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  await screen.findByRole('heading', { name: 'hello' });
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
  fireEvent.click(within(await screen.findByRole('dialog', { name: 'Choose source language' })).getByRole('button', { name: 'English' }));
  fireEvent.click(screen.getByText(/^Notes/));
  fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Draft note' } });
  fireEvent.click(within(screen.getByRole('textbox', { name: 'Personal note' }).closest('details')!).getByRole('button', { name: 'Cancel' }));
  await act(async () => { release(imported); await pending; });
  expect(host.acceptMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  expect(screen.getByRole('button', { name: /New.wav/ })).toBeDefined();
});

test('a relink completed after a note edit stays repaired without selecting it', async () => {
  const host = createHost();
  const missing = { ...second, missing: true };
  let release!: (media: SavedMedia) => void;
  const pending = new Promise<SavedMedia>(resolve => { release = resolve; });
  host.relink.mockReturnValueOnce(pending);
  host.list.mockResolvedValueOnce([first, missing]).mockResolvedValueOnce([first, second]);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  await screen.findByRole('heading', { name: 'hello' });
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(screen.getByRole('button', { name: 'Relink' }));
  expect(host.relink).toHaveBeenCalledWith(second.id, false);
  fireEvent.click(screen.getByText(/^Notes/));
  fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Draft note' } });
  fireEvent.click(within(screen.getByRole('textbox', { name: 'Personal note' }).closest('details')!).getByRole('button', { name: 'Cancel' }));
  await act(async () => { release(second); await pending; });
  expect(host.acceptMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  expect(screen.queryByRole('button', { name: 'Relink' })).toBeNull();
});

test.each(['save', 'discard'] as const)('a note edit cancels a pending media source even after %s', async action => {
  const host = createHost();
  let release!: (media: SavedMedia) => void;
  const pending = new Promise<SavedMedia>(resolve => { release = resolve; });
  host.readMedia.mockReturnValueOnce(pending);
  await mount(host);
  fireEvent.click(screen.getByRole('button', { name: 'Vocab' }));
  await screen.findByRole('heading', { name: 'hello' });
  fireEvent.click(screen.getByRole('button', { name: 'Open Second.wav at 0:00' }));
  expect(host.readMedia).toHaveBeenCalledWith(second.id);
  fireEvent.click(screen.getByText(/^Notes/));
  fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Draft note' } });
  if (action === 'save') {
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save note' }) as HTMLButtonElement).disabled).toBe(true));
  } else {
    fireEvent.click(within(screen.getByRole('textbox', { name: 'Personal note' }).closest('details')!).getByRole('button', { name: 'Cancel' }));
  }
  await act(async () => { release(second); await pending; });
  expect(host.acceptMedia).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: 'Vocab workspace' })).toBeDefined();
});
