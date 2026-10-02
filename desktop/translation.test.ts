import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';

test('sentence translations survive restart, refresh only on request, keep old results on failure, and use host context', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inflow translation '));
  const processor = async (mode: string) => mode === 'probe' ? { duration: 6 } : mode === 'translate' ? { translation: '本地参考' } : { segments: [
    { start: 0, end: 2, text: '친구가 왔어요.', groups: ['친구가 왔어요.'] },
    { start: 2, end: 4, text: '어제 친구를 만났어요.', groups: ['어제 친구를 만났어요.'] },
    { start: 4, end: 6, text: '즐거웠어요.', groups: ['즐거웠어요.'] },
  ] };
  let fail = false;
  let deferred: ((value: string) => void) | undefined;
  let slow = false;
  const translator = async (input: { text: string; previous?: string; next?: string }) => {
    assert.equal(input.previous, '친구가 왔어요.'); assert.equal(input.next, '즐거웠어요.');
    if (slow) return new Promise<string>(resolve => { deferred = resolve; });
    if (fail) throw new Error('offline');
    return '昨天和朋友见面了。';
  };
  let app = new DesktopOperations(directory, processor, undefined, translator);
  try {
    const filename = path.join(directory, 'sample.wav'); await writeFile(filename, 'fixture');
    const media = await app.transcribe((await app.importMedia(filename)).id, 'seed');
    const input = { mediaId: media.id, segmentId: media.segments[1].id };
    assert.equal(await app.translate(input, 'first', 'test'), '昨天和朋友见面了。');
    app.close(); fail = true; app = new DesktopOperations(directory, processor, undefined, translator);
    assert.equal(await app.translate(input, 'cached', ''), '昨天和朋友见面了。');
    await assert.rejects(app.translate(input, 'refresh', 'test', { refresh: true }), /offline/);
    assert.equal(await app.translate(input, 'after-failure', ''), '昨天和朋友见面了。');
    assert.equal(await app.translate(input, 'local', '', { local: true }), '本地参考');
    assert.equal(await app.translate(input, 'latest', ''), '本地参考');
    slow = true;
    const cancelled = app.translate(input, 'cancelled', 'test', { refresh: true });
    app.cancel('cancelled'); deferred!('不能覆盖旧译文');
    await assert.rejects(cancelled, /取消/);
    assert.equal(await app.translate(input, 'after-cancel', ''), '本地参考');
    await assert.rejects(app.translate({ ...input, segmentId: 'missing' }, 'invalid', 'test'));
  } finally { app.close(); await rm(directory, { recursive: true, force: true }); }
});
