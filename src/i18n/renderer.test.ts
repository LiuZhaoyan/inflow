import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizedError, translate } from './index';

test('renderer messages translate controls, counts and source names without changing learning content', () => {
  assert.equal(translate('zh-CN', 'Content'), '内容');
  assert.equal(translate('en', 'Clear search'), 'Clear search');
  assert.equal(translate('zh-CN', 'Clear search'), '清除搜索');
  assert.equal(translate('en', '{count} word', { count: 1 }), '1 word');
  assert.equal(translate('en', '{count} words', { count: 2 }), '2 words');
  assert.equal(translate('zh-CN', '{count} words', { count: 2 }), '2 个词');
  assert.equal(translate('zh-CN', 'Open {word} in vocabulary', { word: '학교' }), '在词汇本中打开 학교');
  assert.equal(localizedError('en', '请选择 50 MB 以内的音频或视频文件。', 'The operation failed. Please retry.'), 'Choose an audio or video file up to 50 MB.');
  assert.equal(localizedError('zh-CN', 'ECONNRESET', 'The operation failed. Please retry.'), '操作失败，请重试。 ECONNRESET');
});
