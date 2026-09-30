import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readBody, foreignOrigin, runProcessor } from './media-server';

test('processor runs through the configured interpreter and model directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow media worker '));
  const originalCwd = process.cwd();
  const originalPython = process.env.INFLOW_PYTHON;
  const originalModels = process.env.INFLOW_MODELS_DIR;
  const originalEncoding = process.env.PYTHONIOENCODING;
  const models = path.join(root, 'models with spaces');
  try {
    await mkdir(path.join(root, 'scripts'));
    await writeFile(path.join(root, 'scripts', 'media_processor.py'), [
      "console.log(JSON.stringify({ translation: '今天天气很好。', mode: process.argv[2], cwd: process.cwd(), models: process.env.INFLOW_MODELS_DIR, encoding: process.env.PYTHONIOENCODING }));",
    ].join('\n'));
    process.chdir(root);
    process.env.INFLOW_PYTHON = process.execPath;
    process.env.INFLOW_MODELS_DIR = models;
    process.env.PYTHONIOENCODING = 'ascii';

    assert.deepEqual(await runProcessor('translate', new AbortController().signal, undefined, '한국어 문장'), {
      translation: '今天天气很好。',
      mode: 'translate',
      cwd: root,
      models,
      encoding: 'utf-8',
    });
  } finally {
    process.chdir(originalCwd);
    if (originalPython === undefined) delete process.env.INFLOW_PYTHON;
    else process.env.INFLOW_PYTHON = originalPython;
    if (originalModels === undefined) delete process.env.INFLOW_MODELS_DIR;
    else process.env.INFLOW_MODELS_DIR = originalModels;
    if (originalEncoding === undefined) delete process.env.PYTHONIOENCODING;
    else process.env.PYTHONIOENCODING = originalEncoding;
    await rm(root, { recursive: true, force: true });
  }
});

test('request size is enforced on actual bytes, even without a length header', async () => {
  const request = new Request('http://localhost/api', { method: 'POST', body: 'abcdef' });
  await assert.rejects(readBody(request, 3), /过大/);
  const valid = new Request('http://localhost/api', { method: 'POST', body: 'abc' });
  assert.equal((await readBody(valid, 3)).toString(), 'abc');
});

import { POST as transcribe } from '../app/api/transcribe/route';
import { POST as translate } from '../app/api/translate/route';

test('routes reject foreign origins and malformed input before inference', async () => {
  const foreign = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', headers: { origin: 'https://other.example' } }));
  assert.equal(foreign.status, 403);
  const malformed = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', body: 'not a media form' }));
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /媒体|文件/);
  const empty = await translate(new Request('http://localhost/api/translate', { method: 'POST', body: '{}' }));
  assert.equal(empty.status, 400);
});

test('origin checks use the browser-facing Host when Next normalizes the internal URL', () => {
  const request = new Request('http://localhost:3010/api/transcribe', { headers: { host: '127.0.0.1:3010', origin: 'http://127.0.0.1:3010' } });
  assert.equal(foreignOrigin(request), false);
  assert.equal(foreignOrigin(new Request(request, { headers: { host: '127.0.0.1:3010', origin: 'http://foreign.example' } })), true);
});
