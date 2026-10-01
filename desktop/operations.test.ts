import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';

test('managed import, processing and learning survive reopen, cancellation, bad results and missing files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow 韩语 '));
  const source = path.join(root, '视频 sample.webm');
  const library = path.join(root, 'library');
  const bytes = Buffer.from('deterministic media fixture');
  const segments = [{ start: 0.1, end: 1.5, text: '안녕하세요.', groups: ['안녕하세요.'] }, { start: 2, end: 4, text: '반갑습니다.', groups: ['반갑습니다.'] }];
  let mode = 'success';
  let processingStarted: (() => void) | undefined;
  const processor = async (_mode: string, signal: AbortSignal) => {
    if (mode === 'cancel') return new Promise((resolve) => { signal.addEventListener('abort', () => resolve({ segments }), { once: true }); processingStarted?.(); });
    return mode === 'invalid' ? { segments: [{ ...segments[0], end: -1 }] } : { segments };
  };
  let app = new DesktopOperations(library, processor);
  try {
    await writeFile(source, bytes);
    const imported = await app.importMedia(source);
    await rm(source);
    assert.deepEqual(await readFile(app.mediaPath(imported.id)), bytes);
    const processed = await app.transcribe(imported.id, 'first');
    const learning = { duration: 5, position: 3, index: 1, rate: 1.5, loop: true };
    app.saveLearning(imported.id, learning);
    app.close(); app = new DesktopOperations(library, processor);
    const restored = app.restore()!;
    assert.equal(restored.id, imported.id);
    assert.deepEqual(restored.segments, processed.segments);
    assert.deepEqual(restored.learning, learning);
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
    await writeFile(source, 'wrong recording');
    await assert.rejects(app.relink(imported.id, source), /同一媒体/);
    await writeFile(source, bytes);
    assert.equal((await app.relink(imported.id, source)).missing, false);
    assert.deepEqual(app.get(imported.id).segments, processed.segments);
    assert.throws(() => app.saveLearning(imported.id, { ...learning, index: 99 }), /状态无效/);
    assert.throws(() => app.mediaPath('../../secrets'), /不存在/);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
