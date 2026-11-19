import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DesktopOperations } from './operations';

test('media candidates retain imported and relinked files without changing the durable selection', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow-media-navigation-'));
  const filename = path.join(root, 'sample.wav');
  const processor = async (mode: string) => mode === 'probe' ? { duration: 3 } : {
    segments: [{ start: 0, end: 3, text: 'Hello world.', groups: ['Hello', ' world.'] }],
  };
  await writeFile(filename, 'media fixture');
  let app = new DesktopOperations(path.join(root, 'library'), processor);
  try {
    const first = await app.importMedia(filename, 'en');
    const second = await app.transcribe((await app.importMedia(filename, 'en', false)).id, 'seed');
    assert.equal(app.restore()!.id, first.id);
    assert.equal(app.get(second.id).id, second.id);
    assert.throws(() => app.open(second.id, 'obsolete-sentence'), /原句已更新/);
    assert.equal(app.restore()!.id, first.id);
    await rm(app.mediaPath(second.id));
    const linked = await app.relink(second.id, filename, false);
    assert.equal(linked.missing, false);
    assert.equal((await readFile(app.mediaPath(second.id))).toString(), 'media fixture');
    assert.equal(app.restore()!.id, first.id);
    assert.equal(app.open(second.id, second.segments[0].id).id, second.id);
    app.close(); app = new DesktopOperations(path.join(root, 'library'), processor);
    assert.equal(app.restore()!.id, second.id);
    await app.relink(first.id, filename);
    assert.equal(app.restore()!.id, first.id, 'legacy relink still selects');
    const third = await app.importMedia(filename);
    assert.equal(app.restore()!.id, third.id, 'legacy import still selects');
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
