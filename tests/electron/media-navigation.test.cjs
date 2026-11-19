/* eslint @typescript-eslint/no-require-imports: off -- Native Electron regression entry point. */
const test = require('node:test');
const path = require('node:path');
const { runNode } = require('./run-node.cjs');

test('media navigation, confirmation and durable restore', () => runNode([path.join(__dirname, 'media-navigation.cjs')]));
