import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale } from './index';

test('interface preference overrides system language and Chinese variants share Simplified Chinese', () => {
  for (const system of ['zh-CN', 'zh-TW', 'zh-Hant', 'ZH-hk']) assert.equal(resolveLocale(undefined, system), 'zh-CN');
  for (const system of ['ko-KR', 'en-US', 'fr', '']) assert.equal(resolveLocale(undefined, system), 'en');
  assert.equal(resolveLocale('en', 'zh-CN'), 'en');
  assert.equal(resolveLocale('zh-CN', 'en-US'), 'zh-CN');
  assert.equal(resolveLocale('unsupported', 'en-US'), 'en');
});
import { dictionaries, translate, localizedError } from './index';

test('bilingual messages cover identifiers and preserve interpolation values and external diagnostics', () => {
  assert.deepEqual(Object.keys(dictionaries['zh-CN']).sort(), Object.keys(dictionaries.en).sort());
  for (const key of Object.keys(dictionaries.en)) {
    const parameters = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(parameters(dictionaries['zh-CN'][key]), parameters(dictionaries.en[key]), key);
  }
  assert.equal(translate('en', 'settings.maskPreview', { color: '#abcdef' }), 'Sample video with a #abcdef subtitle mask');
  assert.equal(translate('zh-CN', 'settings.maskPreview', { color: '#abcdef' }), '使用 #abcdef 字幕遮罩的示例视频');
  assert.equal(translate('zh-CN', 'fallback.example', {}, { en: { 'fallback.example': 'Readable fallback' }, 'zh-CN': {} }), 'Readable fallback');
  assert.equal(localizedError('zh-CN', new Error('host.invalidLocale'), 'settings.saveFailed'), '请选择简体中文或英语界面。');
  assert.equal(localizedError('en', new Error('ECONNRESET'), 'settings.saveFailed'), 'The interface language could not be saved. Retry. ECONNRESET');
  assert.equal(localizedError('en', new Error('  external diagnostic'), ''), '  external diagnostic');
});

test('IPC-owned failures follow the current interface locale while external details stay readable', () => {
  const failure = new Error("Error invoking remote method 'inflow:saveSettings': Error: host.invalidLocale");
  assert.equal(localizedError('zh-CN', failure, 'settings.saveFailed'), '请选择简体中文或英语界面。');
  assert.equal(localizedError('en', new Error('请选择简体中文或英语界面。'), 'settings.saveFailed'), 'Choose Simplified Chinese or English for the interface.');
  assert.equal(localizedError('zh-CN', new Error("Error invoking remote method 'inflow:translate': Error: timeout ECONNRESET"), 'settings.saveFailed'), '无法保存界面语言，请重试。 timeout ECONNRESET');
});
