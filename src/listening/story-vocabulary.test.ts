import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StorySentence from '../workspace/StorySentence';
import type { LearningArtifact, VocabularyEntry } from './desktop';

const artifact: LearningArtifact = { id: 'story', language: 'en', title: 'A walk', createdAt: '', elapsedMs: 0,
  requestedModel: 'deepseek-flash', targets: [{ id: 'walk', lemma: 'walk', meaningZh: '步行' }], sentences: [
    { parts: [{ text: 'I ', targetId: null }, { text: 'walk', targetId: 'walk' }, { text: ' home then home.', targetId: null }], translationZh: '' },
    { parts: [{ text: 'Home is quiet.', targetId: null }], translationZh: '' },
  ] };
const entry: VocabularyEntry = { id: 'home', language: 'en', lemma: 'home', meaningZh: '家', selected: false,
  contexts: [{ id: 'first', surface: 'home', surfaceStarts: [17], sentence: 'I walk home then home.',
    source: { type: 'artifact', artifactId: artifact.id, sentenceIndex: 0, name: artifact.title } },
  { id: 'second', surface: 'Home', surfaceStarts: [0], sentence: 'Home is quiet.',
    source: { type: 'artifact', artifactId: artifact.id, sentenceIndex: 1, name: artifact.title } }] };

const render = (index: number, vocabulary: VocabularyEntry[]) => renderToStaticMarkup(createElement(StorySentence, { artifact, index, vocabulary }));

test('Story highlights collected positions in every sentence while preserving target annotations and text', () => {
  const first = render(0, [entry]);
  assert.match(first, /<span> home then <\/span><mark data-vocabulary-id="home" title="家">home<\/mark>/);
  assert.match(first, /<mark data-target-id="walk" title="步行">walk<\/mark>/);
  assert.equal(first.replace(/<[^>]+>/g, ''), 'I walk home then home.');
  assert.match(render(1, [entry]), /<mark data-vocabulary-id="home" title="家">Home<\/mark>/);
  assert.doesNotMatch(render(0, []), /data-vocabulary-id/);
  assert.doesNotMatch(render(0, [{ ...entry, contexts: entry.contexts.map(context => ({ ...context,
    source: { ...context.source, type: 'artifact', artifactId: 'other-story', sentenceIndex: 0 } })) }]), /data-vocabulary-id/);
});

test('Story retains target IDs when collection overlaps a target, and legacy contexts use a first-match fallback', () => {
  const target: VocabularyEntry = { ...entry, id: 'walk', meaningZh: '走路', contexts: [{ id: 'target', surface: 'walk',
    sentence: 'I walk home then home.', surfaceStarts: [2], source: entry.contexts[0].source }] };
  assert.match(render(0, [target]), /<mark data-target-id="walk" data-vocabulary-id="walk" title="走路">walk<\/mark>/);
  const legacy = { ...entry, contexts: [{ ...entry.contexts[0], surfaceStarts: undefined }] };
  assert.match(render(0, [legacy]), /<mark data-vocabulary-id="home" title="家">home<\/mark><span> then home\.<\/span>/);
});
