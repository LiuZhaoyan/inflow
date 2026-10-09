const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { cleanupDefaultProfiles, cleanupProfile, disposableProfiles } = require('./verify-packaged.cjs');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'inflow-packaged-cleanup-'));
}

test('cleanup removes only disposable profiles after a successful suite', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profileRoot = path.join(root, 'profiles');
  const evidence = path.join(root, 'evidence');
  const custom = path.join(profileRoot, 'custom-profile');
  const reusableModels = path.join(root, 'models');
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(custom, { recursive: true });
  fs.mkdirSync(reusableModels, { recursive: true });
  for (const name of disposableProfiles) fs.mkdirSync(path.join(profileRoot, name), { recursive: true });

  const dryRun = cleanupDefaultProfiles(evidence, { profileRoot, rootBoundary: root, dryRun: true });
  assert.ok(dryRun.every(result => result.status === 'planned'));
  assert.ok(fs.existsSync(path.join(profileRoot, disposableProfiles[0])));

  const cleanup = cleanupDefaultProfiles(evidence, { profileRoot, rootBoundary: root });
  assert.ok(cleanup.every(result => result.status === 'removed'));
  assert.ok(fs.existsSync(custom));
  assert.ok(fs.existsSync(reusableModels));
  assert.ok(!fs.existsSync(path.join(profileRoot, disposableProfiles[0])));
});

test('cleanup retains custom profiles and evidence-bearing profiles', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profileRoot = path.join(root, 'profiles');
  const evidenceProfile = path.join(profileRoot, disposableProfiles[0]);
  const evidence = path.join(evidenceProfile, 'failed-run');
  fs.mkdirSync(evidence, { recursive: true });

  assert.equal(cleanupProfile(evidenceProfile, path.join(root, 'other-evidence'), { profileRoot, rootBoundary: root, custom: true }).status, 'skipped');
  assert.equal(cleanupProfile(evidenceProfile, evidence, { profileRoot, rootBoundary: root }).status, 'skipped');
  assert.ok(fs.existsSync(evidence));
});
