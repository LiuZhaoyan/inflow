import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readBody, foreignOrigin, runProcessor, processorCommand, processorPaths } from './media-server';

test('packaged worker binary bypasses the Python interpreter and keeps stdio conventions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow packaged worker '));
  const originalWorker = process.env.INFLOW_WORKER;
  const originalModels = process.env.INFLOW_MODELS_DIR;
  try {
    const worker = path.join(root, 'resources', 'media-processor', 'media_processor.exe');
    process.env.INFLOW_WORKER = worker;
    delete process.env.INFLOW_MODELS_DIR;
    const paths = processorPaths(root, process.env, 'win32');
    assert.equal(paths.binary, path.win32.resolve(root, worker));
    assert.deepEqual(processorCommand('transcribe', '韩语 sample.webm', 'ko', paths),
      { command: paths.binary, args: ['transcribe', '韩语 sample.webm', 'ko'] });
    assert.deepEqual(processorCommand('models', undefined, 'ko', paths), { command: paths.binary, args: ['models'] });
    assert.deepEqual(processorCommand('setup', undefined, 'ko', paths), { command: paths.binary, args: ['setup'] });
    await assert.rejects(runProcessor('models', new AbortController().signal), /本地处理组件缺失/);
  } finally {
    if (originalWorker === undefined) delete process.env.INFLOW_WORKER;
    else process.env.INFLOW_WORKER = originalWorker;
    if (originalModels === undefined) delete process.env.INFLOW_MODELS_DIR;
    else process.env.INFLOW_MODELS_DIR = originalModels;
    await rm(root, { recursive: true, force: true });
  }
});

test('processor uses configured paths and encoding, and permits retry after cancellation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow media worker '));
  const originalCwd = process.cwd();
  const originalPython = process.env.INFLOW_PYTHON;
  const originalModels = process.env.INFLOW_MODELS_DIR;
  const originalEncoding = process.env.PYTHONIOENCODING;
  const models = path.join(root, 'models with spaces');
  try {
    await mkdir(path.join(root, 'scripts'));
    await writeFile(path.join(root, 'scripts', 'media_processor.py'), [
      "const result = process.argv[2] === 'probe' ? { duration: 600 } : { translation: '今天天气很好。' }; setTimeout(() => console.log(JSON.stringify({ ...result, mode: process.argv[2], cwd: process.cwd(), models: process.env.INFLOW_MODELS_DIR, encoding: process.env.PYTHONIOENCODING })), process.argv[2] === 'transcribe' ? 60000 : 0);",
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

    const controller = new AbortController();
    const pending = runProcessor('transcribe', controller.signal, 'sample.webm');
    assert.deepEqual(await runProcessor('probe', new AbortController().signal, 'sample.webm'), {
      duration: 600,
      mode: 'probe',
      cwd: root,
      models,
      encoding: 'utf-8',
    });
    setTimeout(() => controller.abort(), 100);
    await assert.rejects(pending, /处理已取消/);
    assert.equal((await runProcessor('translate', new AbortController().signal, undefined, '한국어 문장') as { translation: string }).translation, '今天天气很好。');
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

test('API processing failures retain original diagnostic data independently of localized guidance', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow api diagnostics '));
  const originalCwd = process.cwd();
  const originalPython = process.env.INFLOW_PYTHON;
  const originalWorker = process.env.INFLOW_WORKER;
  const diagnostic = '  fixture external diagnostic: ECONNRESET';
  try {
    await mkdir(path.join(root, 'scripts'));
    await writeFile(path.join(root, 'scripts', 'media_processor.py'), `console.log(JSON.stringify({ error: ${JSON.stringify(diagnostic)} }));`);
    process.chdir(root);
    process.env.INFLOW_PYTHON = process.execPath;
    delete process.env.INFLOW_WORKER;
    for (const locale of ['en', 'zh-CN']) {
      const headers = { 'accept-language': locale };
      const body = new FormData();
      body.set('file', new File(['fixture'], 'sample.wav', { type: 'audio/wav' }));
      const mediaFailure = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', headers, body }));
      const textFailure = await translate(new Request('http://localhost/api/translate', { method: 'POST', headers, body: JSON.stringify({ text: '한국어 문장' }) }));
      for (const response of [mediaFailure, textFailure]) {
        assert.equal(response.status, 503);
        const result = await response.json();
        assert.equal(result.detail, diagnostic);
        assert.ok(result.error.endsWith(diagnostic));
        assert.match(result.error, locale === 'en' ? /failed\. Retry\./ : /失败，请重试。/);
      }
    }
  } finally {
    process.chdir(originalCwd);
    if (originalPython === undefined) delete process.env.INFLOW_PYTHON;
    else process.env.INFLOW_PYTHON = originalPython;
    if (originalWorker === undefined) delete process.env.INFLOW_WORKER;
    else process.env.INFLOW_WORKER = originalWorker;
    await rm(root, { recursive: true, force: true });
  }
});

test('routes reject foreign origins and malformed input before inference', async () => {
  const foreign = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', headers: { origin: 'https://other.example' } }));
  assert.equal(foreign.status, 403);
  const malformed = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', headers: { 'accept-language': 'zh-CN' }, body: 'not a media form' }));
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /媒体|文件/);
  const empty = await translate(new Request('http://localhost/api/translate', { method: 'POST', body: '{}' }));
  assert.equal(empty.status, 400);
});

test('browser API failures use the requested interface language without changing validation', async () => {
  for (const [locale, originMessage, inputMessage] of [
    ['en', 'Start processing from the current Inflow page.', 'Translation text is empty, too long, or malformed.'],
    ['zh-CN', '请从当前 Inflow 页面发起处理。', '翻译内容为空、过长或格式不正确。'],
  ]) {
    const denied = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST', headers: { origin: 'https://other.example', 'accept-language': locale } }));
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error, originMessage);
    const invalid = await translate(new Request('http://localhost/api/translate', { method: 'POST', headers: { 'accept-language': locale }, body: '{}' }));
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, inputMessage);
  }
});

test('origin checks use the browser-facing Host when Next normalizes the internal URL', () => {
  const request = new Request('http://localhost:3010/api/transcribe', { headers: { host: '127.0.0.1:3010', origin: 'http://127.0.0.1:3010' } });
  assert.equal(foreignOrigin(request), false);
  assert.equal(foreignOrigin(new Request(request, { headers: { host: '127.0.0.1:3010', origin: 'http://foreign.example' } })), true);
});
