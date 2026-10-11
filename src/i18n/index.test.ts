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

test('local worker failures use the interface language while learning-language details stay accurate', () => {
  for (const [original, english] of [
    ['英语分析模型尚未安装，请运行 scripts/setup_models.py 后重试。', 'The English analysis model is not installed. Run scripts/setup_models.py and retry.'],
    ['翻译模型尚未安装，请运行模型安装脚本后重试。', 'The translation model is not installed. Run the model installation script and retry.'],
    ['媒体没有音轨，请选择包含语音的音频或视频。', 'The media has no audio track. Choose audio or video containing speech.'],
    ['没有识别到语音，请换一段声音清晰的韩语媒体重试。', 'No speech was recognized. Retry with clear Korean speech.'],
    ['没有识别到语音，请换一段声音清晰的英语媒体重试。', 'No speech was recognized. Retry with clear English speech.'],
    ['本地模型无法处理此媒体或文本，请确认模型安装完整，或换一段清晰的媒体重试。', 'The local model could not process this media or text. Check that models are fully installed, or retry with clear media.'],
  ]) {
    assert.equal(localizedError('en', new Error(original), 'host.failure'), english);
    assert.equal(localizedError('zh-CN', new Error(english), 'host.failure'), original);
  }
});

test('expanded owned HTTP failures follow interface changes without changing their status', () => {
  const english = 'DeepSeek rejected the request (HTTP 400). Check the request and retry.';
  const chinese = 'DeepSeek 拒绝了请求（HTTP 400），请检查请求后重试。';
  assert.equal(localizedError('zh-CN', new Error(english), 'host.failure'), chinese);
  assert.equal(localizedError('en', new Error(chinese), 'host.failure'), english);
});
