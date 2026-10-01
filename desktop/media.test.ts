import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { serveMedia } from './media';

test('managed media serves bounded ranges for seeking, including suffixes and invalid ranges', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow ranges '));
  const file = path.join(root, 'sample.webm');
  try {
    await writeFile(file, '0123456789');
    const request = (range: string) => new Request('inflow://app/media/id', { headers: { Range: range } });
    const middle = await serveMedia(file, request('bytes=3-5'));
    assert.equal(middle.status, 206); assert.equal(middle.headers.get('content-range'), 'bytes 3-5/10');
    assert.equal(await middle.text(), '345');
    assert.equal(await (await serveMedia(file, request('bytes=-2'))).text(), '89');
    assert.equal(await (await serveMedia(file, request('bytes=8-'))).text(), '89');
    assert.equal((await serveMedia(file, request('bytes=99-'))).status, 416);
    assert.equal((await serveMedia(file, request('bytes=-0'))).status, 416);
  } finally { await rm(root, { recursive: true, force: true }); }
});
