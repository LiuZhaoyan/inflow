const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  cleanupOwnedSuite,
  cleanupProfile,
  createSuiteOwnership,
  runSuite,
  suitePlan,
} = require('./verify-packaged.cjs');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'inflow-packaged-suite-'));
}

function option(args, name) {
  const prefix = name + '=';
  const value = args.find(argument => argument.startsWith(prefix));
  return value?.slice(prefix.length);
}

function fakeRunner(calls, { failPhase, signalPhase, timeoutPhase, omitResultPhase } = {}) {
  return args => {
    const phase = args[1];
    const phaseDir = args[2];
    const profile = option(args, 'profile');
    const profileRoot = option(args, 'profileRoot');
    calls.push({ phase, phaseDir, profile, profileRoot, args });
    fs.mkdirSync(profile, { recursive: true });
    fs.writeFileSync(path.join(profile, 'phase.txt'), phase);
    fs.mkdirSync(phaseDir, { recursive: true });
    if (phase !== omitResultPhase) {
      const result = phase === 'listen'
        ? { ok: true, sentenceCount: 31, selectedIndex: 2, video: { currentTime: 1.2 } }
        : phase === 'cycle'
          ? { ok: true, learning: { id: 'learning' }, vocabulary: [], artifacts: [] }
          : { ok: true };
      fs.writeFileSync(path.join(phaseDir, 'result.json'), JSON.stringify(result));
    }
    if (phase === failPhase) return { status: 1, signal: null };
    if (phase === timeoutPhase) return { status: null, signal: 'SIGTERM', error: { message: 'spawnSync ETIMEDOUT' } };
    if (phase === signalPhase) return { status: null, signal: 'SIGTERM' };
    return { status: 0, signal: null };
  };
}

test('suite runs all phases in order with only intended shared profiles', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = [];
  const evidence = path.join(root, 'evidence');
  const profileBase = path.join(root, 'suite-profiles');

  assert.equal(runSuite(evidence, {}, {
    suiteRoot: profileBase,
    rootBoundary: root,
    spawnPhase: fakeRunner(calls),
  }), 0);
  assert.deepEqual(calls.map(call => call.phase), suitePlan);
  assert.ok(calls.every(call => call.profileRoot === calls[0].profileRoot));
  assert.equal(calls[3].profile, calls[4].profile);
  assert.equal(calls[4].profile, calls[5].profile);
  assert.equal(calls[7].profile, calls[8].profile);
  assert.equal(calls[8].profile, calls[9].profile);
  assert.equal(calls[9].profile, calls[10].profile);
  assert.notEqual(calls[3].profile, calls[7].profile);
  assert.equal(new Set(calls.map(call => call.profile)).size, 6);
  assert.equal(option(calls[4].args, 'expectedSentences'), '31');
  assert.equal(option(calls[4].args, 'expectedIndex'), '2');
  assert.equal(option(calls[4].args, 'expectedPosition'), '1.2');
  assert.equal(option(calls[9].args, 'expectedFile'), path.join(evidence, 'cycle', 'result.json'));
  assert.ok(!fs.existsSync(path.dirname(calls[0].profileRoot)));

  const summary = JSON.parse(fs.readFileSync(path.join(evidence, 'suite.json'), 'utf8'));
  assert.equal(summary.ok, true);
  assert.equal(summary.phases.length, 11);
  assert.equal(JSON.parse(fs.readFileSync(path.join(evidence, 'suite-precleanup.json'), 'utf8')).cleanup.status, 'pending');
});

test('failed, signaled, and incomplete suites retain profiles and evidence', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scenarios = [
    { name: 'failed', failPhase: 'cycle' },
    { name: 'timed-out', timeoutPhase: 'cycle' },
    { name: 'cancelled', signalPhase: 'cycle' },
    { name: 'incomplete', omitResultPhase: 'listen' },
  ];

  for (const scenario of scenarios) {
    const calls = [];
    const evidence = path.join(root, scenario.name, 'evidence');
    const profileBase = path.join(root, scenario.name, 'suite-profiles');
    const code = runSuite(evidence, {}, {
      suiteRoot: profileBase,
      rootBoundary: root,
      spawnPhase: fakeRunner(calls, scenario),
    });
    assert.equal(code, 1, scenario.name);
    assert.ok(calls.length > 0, scenario.name);
    const suiteRoot = path.dirname(calls[0].profileRoot);
    assert.ok(fs.existsSync(suiteRoot), scenario.name);
    assert.ok(fs.existsSync(path.join(suiteRoot, 'owner.json')), scenario.name);
    assert.ok(fs.existsSync(path.join(evidence, 'suite.json')), scenario.name);
    assert.equal(JSON.parse(fs.readFileSync(path.join(evidence, 'suite.json'), 'utf8')).ok, false, scenario.name);
  }
});

test('overlapping suites own unique roots and repeated execution preserves prior evidence', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profileBase = path.join(root, 'suite-profiles');
  const earlier = createSuiteOwnership({ baseRoot: profileBase, rootBoundary: root });
  const earlierState = path.join(earlier.profileRoot, 'earlier.txt');
  fs.writeFileSync(earlierState, 'retain');

  const firstEvidence = path.join(root, 'first-evidence');
  const firstCalls = [];
  assert.equal(runSuite(firstEvidence, {}, {
    suiteRoot: profileBase,
    rootBoundary: root,
    spawnPhase: fakeRunner(firstCalls),
  }), 0);
  assert.ok(fs.existsSync(earlierState));
  assert.notEqual(path.dirname(firstCalls[0].profileRoot), earlier.suiteRoot);

  const beforeRepeat = fs.readFileSync(path.join(firstEvidence, 'suite.json'), 'utf8');
  assert.equal(runSuite(firstEvidence, {}, {
    suiteRoot: profileBase,
    rootBoundary: root,
    spawnPhase: fakeRunner([]),
  }), 1);
  assert.equal(fs.readFileSync(path.join(firstEvidence, 'suite.json'), 'utf8'), beforeRepeat);
  assert.ok(fs.existsSync(earlierState));
  assert.equal(cleanupOwnedSuite(earlier, path.join(root, 'other-evidence')).status, 'removed');
});

test('custom paths, traversal, markers, and symlinks cannot authorize deletion', t => {
  const root = tempRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profileRoot = path.join(root, 'profiles');
  const outside = path.join(root, 'outside');
  const evidence = path.join(root, 'evidence');
  const customProfile = path.join(root, 'custom-profile');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(customProfile, { recursive: true });
  fs.writeFileSync(path.join(customProfile, 'keep.txt'), 'keep');

  assert.equal(cleanupProfile(path.join(profileRoot, '..', 'outside'), evidence, { profileRoot, rootBoundary: root }).status, 'skipped');
  assert.equal(cleanupProfile(outside, evidence, { profileRoot, rootBoundary: root, custom: true }).status, 'skipped');
  assert.ok(fs.existsSync(outside));
  assert.equal(runSuite(path.join(root, 'custom-evidence'), { profile: customProfile }, { suiteRoot: path.join(root, 'suite-profiles'), rootBoundary: root, spawnPhase: fakeRunner([]) }), 1);
  assert.ok(fs.existsSync(path.join(customProfile, 'keep.txt')));

  const ownership = createSuiteOwnership({ baseRoot: path.join(root, 'suite-profiles'), rootBoundary: root });
  fs.writeFileSync(ownership.markerPath, JSON.stringify({ ...ownership.marker, suiteId: 'another-suite' }));
  assert.equal(cleanupOwnedSuite(ownership, evidence).status, 'skipped');
  assert.ok(fs.existsSync(ownership.suiteRoot));

  const realRoot = path.join(root, 'real-profiles');
  const linkedRoot = path.join(root, 'linked-profiles');
  const realEvidence = path.join(root, 'real-evidence');
  const linkedEvidence = path.join(root, 'linked-evidence');
  const symlinkOwnership = createSuiteOwnership({ baseRoot: path.join(root, 'symlink-suite-profiles'), rootBoundary: root });
  const linkedSuite = path.join(symlinkOwnership.baseRoot, 'linked-suite');
  fs.mkdirSync(realRoot, { recursive: true });
  fs.mkdirSync(realEvidence, { recursive: true });
  try {
    fs.symlinkSync(realRoot, linkedRoot, 'junction');
    fs.symlinkSync(realEvidence, linkedEvidence, 'junction');
    fs.symlinkSync(symlinkOwnership.suiteRoot, linkedSuite, 'junction');
  } catch (error) {
    t.skip('directory junctions are unavailable: ' + error.message);
    return;
  }
  const linkedOwnership = {
    ...symlinkOwnership,
    suiteRoot: linkedSuite,
    profileRoot: path.join(linkedSuite, 'profiles'),
    marker: { ...symlinkOwnership.marker, suiteId: path.basename(linkedSuite), profileRoot: path.join(linkedSuite, 'profiles') },
  };
  assert.equal(cleanupOwnedSuite(linkedOwnership, evidence).status, 'skipped');
  assert.ok(fs.existsSync(symlinkOwnership.suiteRoot));
  assert.equal(runSuite(path.join(linkedEvidence, 'run'), {}, { suiteRoot: path.join(root, 'more-suite-profiles'), rootBoundary: root, spawnPhase: fakeRunner([]) }), 1);
  assert.ok(!fs.existsSync(path.join(realEvidence, 'run')));
  const linkedTarget = path.join(linkedRoot, 'victim');
  fs.mkdirSync(linkedTarget, { recursive: true });
  assert.equal(cleanupProfile(linkedTarget, evidence, { profileRoot: linkedRoot, rootBoundary: root }).status, 'skipped');
  assert.ok(fs.existsSync(linkedTarget));
});
