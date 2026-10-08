import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';

test('global mask color survives restart, rejects invalid input and leaves per-video learning intact', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow settings '));
  const library = path.join(root, 'library');
  const processor = async () => ({ duration: 5 });
  let app = new DesktopOperations(library, processor);
  try {
    assert.deepEqual(app.getSettings(), { videoMaskColor: '#000000' });
    const source = path.join(root, 'sample.webm');
    await writeFile(source, 'settings media fixture');
    const first = await app.importMedia(source, 'en');
    const second = await app.importMedia(source, 'ko');
    const learning = { ...first.learning, position: 2, videoMask: { enabled: true, x: 0.1, y: 0.7, width: 0.8, height: 0.2 } };
    app.saveLearning(first.id, learning);
    assert.deepEqual(app.saveSettings({ videoMaskColor: '#BCA4F8' }), { videoMaskColor: '#bca4f8' });
    for (const color of ['red', '#fff', '#00000000', 'url(example)', '', null, 123]) {
      assert.throws(() => app.saveSettings({ videoMaskColor: color as string }), /valid subtitle mask color/);
    }
    assert.throws(() => app.saveSettings(null as unknown as { videoMaskColor: string }), /valid subtitle mask color/);
    app.close(); app = new DesktopOperations(library, processor);
    assert.deepEqual(app.getSettings(), { videoMaskColor: '#bca4f8' });
    assert.deepEqual(app.get(first.id).learning, learning);
    assert.deepEqual(app.get(second.id).learning, second.learning);
    assert.equal(app.restore()!.id, second.id);
    assert.equal(app.getImportLanguage(), 'ko');
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('import rejects media over 600 seconds before storing it and accepts the exact limit', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow duration '));
  const source = path.join(root, 'sample.webm');
  const library = path.join(root, 'library');
  let duration = 600.001;
  const processor = async (mode: string) => mode === 'probe' ? { duration } : {};
  const app = new DesktopOperations(library, processor);
  try {
    await writeFile(source, 'deterministic media fixture');
    await assert.rejects(app.importMedia(source), /10 分钟以内/);
    assert.deepEqual(app.list(), []);
    assert.deepEqual(await readdir(path.join(library, 'media')), []);

    duration = 600;
    const imported = await app.importMedia(source);
    assert.equal(imported.learning.duration, 600);
    const duplicate = await app.importMedia(source);
    assert.notEqual(duplicate.id, imported.id);
    assert.equal(app.list().length, 2);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('managed import, processing and learning survive reopen, cancellation, bad results and missing files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow 韩语 '));
  const source = path.join(root, '视频 sample.webm');
  const library = path.join(root, 'library');
  const bytes = Buffer.from('deterministic media fixture');
  const segments = [{ start: 0.1, end: 1.5, text: '오늘 날씨가 정말 좋아요.', groups: ['오늘 날씨가', '정말', '좋아요.'] }, { start: 2, end: 4, text: '반갑습니다.', groups: ['반갑습니다.'] }];
  let mode = 'success';
  let processingStarted: (() => void) | undefined;
  const processor = async (_mode: string, signal: AbortSignal) => {
    if (_mode === 'probe') return { duration: 5 };
    if (mode === 'cancel') return new Promise((resolve) => { signal.addEventListener('abort', () => resolve({ segments }), { once: true }); processingStarted?.(); });
    return mode === 'invalid' ? { segments: [{ ...segments[0], end: -1 }] } : { segments };
  };
  let app = new DesktopOperations(library, processor);
  try {
    await writeFile(source, bytes);
    const imported = await app.importMedia(source);
    await rm(source);
    assert.deepEqual(await readFile(app.mediaPath(imported.id)), bytes);
    assert.equal(imported.learning.videoMask, undefined);
    const processed = await app.transcribe(imported.id, 'first');
    const videoMask = { enabled: true, x: 0.1, y: 0.7, width: 0.8, height: 0.2 };
    const masks = { [processed.segments[0].id]: [0, 2], [processed.segments[1].id]: [0] };
    const learning = { duration: 5, position: 3, index: 1, rate: 1.5, loop: true, mode: 'sentence' as const, masks, videoMask };
    app.saveLearning(imported.id, learning);
    app.close(); app = new DesktopOperations(library, processor);
    const restored = app.restore()!;
    assert.equal(restored.id, imported.id);
    assert.deepEqual(restored.segments, processed.segments);
    assert.deepEqual(restored.learning, learning);
    app.saveLearning(imported.id, { position: learning.position, index: learning.index, rate: learning.rate, loop: learning.loop, duration: learning.duration });
    assert.equal(app.get(imported.id).learning.mode, 'full');
    assert.deepEqual(app.get(imported.id).learning.masks, masks);
    assert.deepEqual(app.get(imported.id).learning.videoMask, videoMask);
    app.saveLearning(imported.id, { ...learning, masks: {}, videoMask: { ...videoMask, enabled: false } });
    assert.deepEqual(app.get(imported.id).learning.videoMask, { ...videoMask, enabled: false });
    assert.equal(app.get(imported.id).learning.masks, undefined);
    app.saveLearning(imported.id, learning);
    mode = 'invalid';
    await assert.rejects(app.transcribe(imported.id, 'invalid'));
    assert.deepEqual(app.get(imported.id), restored);
    mode = 'cancel';
    const started = new Promise<void>(resolve => { processingStarted = resolve; });
    const pending = app.transcribe(imported.id, 'cancel');
    await started; app.cancel('cancel');
    await assert.rejects(pending, /取消/);
    assert.deepEqual(app.get(imported.id), restored);
    await rm(app.mediaPath(imported.id));
    assert.equal(app.get(imported.id).missing, true);
    assert.deepEqual(app.get(imported.id).segments, processed.segments);
    app.saveLearning(imported.id, learning);
    assert.deepEqual(app.get(imported.id).learning.masks, masks);
    await writeFile(source, 'wrong recording');
    await assert.rejects(app.relink(imported.id, source), /同一媒体/);
    await writeFile(source, bytes);
    assert.equal((await app.relink(imported.id, source)).missing, false);
    assert.deepEqual(app.get(imported.id).segments, processed.segments);
    assert.throws(() => app.saveLearning(imported.id, { ...learning, index: 99 }), /状态无效/);
    assert.throws(() => app.saveLearning(imported.id, { ...learning, mode: 'invalid' as 'full' }), /状态无效/);
    for (const groups of [[-1], [3], [0.5], [0, 0]]) {
      assert.throws(() => app.saveLearning(imported.id, { ...learning, masks: { [processed.segments[0].id]: groups } }), /遮罩无效/);
    }
    assert.throws(() => app.saveLearning(imported.id, { ...learning, masks: { 'another-sentence': [0] } }), /遮罩无效/);
    assert.throws(() => app.saveLearning(imported.id, { ...learning, masks: null as unknown as Record<string, number[]> }), /遮罩无效/);
    assert.throws(() => app.saveLearning(imported.id, { ...learning, videoMask: { ...videoMask, x: 0.9 } }), /视频字幕遮罩无效/);
    assert.deepEqual(app.get(imported.id).learning, learning);
    mode = 'success';
    const reprocessed = await app.transcribe(imported.id, 'reprocess');
    assert.equal(reprocessed.learning.masks, undefined);
    assert.deepEqual(reprocessed.learning.videoMask, videoMask);
    assert.notEqual(reprocessed.segments[0].id, processed.segments[0].id);
    assert.throws(() => app.saveLearning(imported.id, learning), /遮罩无效/);
    assert.throws(() => app.mediaPath('../../secrets'), /不存在/);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('reprocessing keeps learning state saved while the worker is in flight', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow reprocess state '));
  const file = path.join(root, 'sample.webm');
  const original = [{ start: 0.1, end: 1, text: '첫 문장.', groups: ['첫 문장.'] }];
  const updated = [
    { start: 0.2, end: 1.5, text: '첫 문장.', groups: ['첫 문장.'] },
    { start: 2.2, end: 3.2, text: '둘째 문장.', groups: ['둘째 문장.'] },
    { start: 5, end: 6, text: '셋째 문장.', groups: ['셋째 문장.'] },
  ];
  let reprocessing = false;
  let processingStarted: (() => void) | undefined;
  let finishProcessing: (() => void) | undefined;
  const processor = async (mode: string) => {
    if (mode === 'probe') return { duration: 10 };
    if (reprocessing) {
      processingStarted?.();
      await new Promise<void>(resolve => { finishProcessing = resolve; });
      return { segments: updated };
    }
    return { segments: original };
  };
  const app = new DesktopOperations(path.join(root, 'library'), processor);
  try {
    await writeFile(file, 'fixture');
    const imported = await app.importMedia(file);
    await app.transcribe(imported.id, 'first');
    reprocessing = true;
    const started = new Promise<void>(resolve => { processingStarted = resolve; });
    const pending = app.transcribe(imported.id, 'second');
    await started;
    const latest = { duration: 10, position: 4.5, index: 0, rate: 1.5, loop: true, mode: 'sentence' as const, videoMask: { enabled: false, x: 0.1, y: 0.7, width: 0.8, height: 0.2 } };
    app.saveLearning(imported.id, latest);
    finishProcessing!();
    const result = await pending;
    assert.deepEqual(result.learning, { ...latest, index: 1 });
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});


test('video mask state is independent per material and is not accepted for audio', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow video mask '));
  const app = new DesktopOperations(path.join(root, 'library'), async () => ({ duration: 5 }));
  try {
    const videoFile = path.join(root, 'video.mp4'), audioFile = path.join(root, 'audio.wav');
    await writeFile(videoFile, 'video fixture'); await writeFile(audioFile, 'audio fixture');
    const first = await app.importMedia(videoFile), second = await app.importMedia(videoFile), audio = await app.importMedia(audioFile);
    const videoMask = { enabled: true, x: 0.05, y: 0.8, width: 0.9, height: 0.15 };
    app.saveLearning(first.id, { ...first.learning, videoMask });
    assert.deepEqual(app.open(first.id).learning.videoMask, videoMask);
    assert.equal(app.open(second.id).learning.videoMask, undefined);
    assert.throws(() => app.saveLearning(audio.id, { ...audio.learning, videoMask }), /只适用于视频/);
    assert.equal(app.get(audio.id).learning.videoMask, undefined);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
