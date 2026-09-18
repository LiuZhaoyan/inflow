import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBody, foreignOrigin } from './media-server';

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
