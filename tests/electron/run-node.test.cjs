/* eslint @typescript-eslint/no-require-imports: off -- Verify native process timeout cleanup. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runNode } = require('./run-node.cjs');

test('a timed-out native run terminates its child and grandchild', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inflow-process-timeout-'));
  const pidsFile = path.join(directory, 'pids.json');
  try {
    const code = `const child = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']); require('node:fs').writeFileSync(${JSON.stringify(pidsFile)}, JSON.stringify([process.pid, child.pid])); setInterval(() => {}, 1000);`;
    await assert.rejects(runNode(['-e', code], 2000), /timed out/);
    const pids = JSON.parse(await readFile(pidsFile, 'utf8'));
    assert.equal(pids.length, 2);
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
