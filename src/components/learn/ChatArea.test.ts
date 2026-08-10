import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderAiContent } from './ChatArea';

test('renderAiContent formats lightweight Markdown without exposing markers', () => {
    const html = renderToStaticMarkup(createElement('div', null, renderAiContent('Use **bold**, *italics*, and `code`.\nNext line.')));

    assert.match(html, /<strong[^>]*>bold<\/strong>/);
    assert.match(html, /<em>italics<\/em>/);
    assert.match(html, /<code[^>]*>code<\/code>/);
    assert.match(html, /<br\/>Next line\./);
    assert.doesNotMatch(html, /\*\*bold\*\*|\*italics\*|`code`/);
});
