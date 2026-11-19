/* eslint @typescript-eslint/no-require-imports: off -- Native Electron regression entry point. */
const test = require('node:test');
const path = require('node:path');
const { runNode } = require('./run-node.cjs');

test('native desktop regressions', async t => {
  await t.test('vocabulary state', () => runNode([path.join(__dirname, 'vocabulary-state.cjs')]));
  await t.test('Story ordering, drafts, notices and process recovery', () => runNode([path.join(__dirname, 'story-navigation.cjs')]));
});
