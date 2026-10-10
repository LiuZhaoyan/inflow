#!/usr/bin/env node
// Outer orchestrator for packaged-app acceptance runs. Launches build/package/Inflow-win32-x64/Inflow.exe
// with the INFLOW_DESKTOP_DRIVER seam, a hermetic profile (optionally Chinese/spaced), a minimal
// environment without any development paths, and records evidence + orphan-process checks.
// Usage: node scripts/verify-packaged.cjs <phase|suite> <runDir> [option=value ...]
// Phases: credential models download listen reopen missing cancel cycle failures restart screenshots
// `suite` runs the phases in dependency order and cleans only its atomically owned profiles after success.
// Single phases support cleanup=true; failures retain profiles and evidence. Use keep=true to preserve them.
const { spawn, spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageTestRoot = path.join(root, 'build', 'package-test');
const disposableRoot = path.join(packageTestRoot, 'profiles');
const suiteBaseRoot = path.join(packageTestRoot, 'suites');
const defaultMedia = path.join(root, '.scratch', 'desktop-learning', 'generated-samples', 'desktop-acceptance-GBTE8b', '韩语 sample.webm');
const repoModels = path.join(root, '.models');

const phaseConfig = {
  credential:  { profile: '凭据 验证', seed: [], timeout: 60000, fresh: true, credential: true },
  models:      { profile: '配置 模型验证', seed: [], timeout: 300000, fresh: true },
  download:    { profile: '模型 下载验证', seed: ['whisper-turbo', 'english-parser'], timeout: 360000, fresh: true },
  listen:      { profile: '中文 学习 目录', seed: ['whisper-turbo', 'ko_en', 'translate-en_zh-1_9', 'english-parser'], timeout: 780000, fresh: true, media: true },
  reopen:      { profile: '中文 学习 目录', seed: [], timeout: 240000, media: true },
  missing:     { profile: '中文 学习 目录', seed: [], timeout: 240000, media: true, deleteMedia: true },
  cancel:      { profile: '中文 取消 目录', seed: ['whisper-turbo'], timeout: 300000, fresh: true, media: true },
  cycle:       { profile: '中文 循环 目录', seed: ['whisper-turbo', 'ko_en', 'translate-en_zh-1_9', 'english-parser'], timeout: 1500000, fresh: true, media: true, credential: true },
  failures:    { profile: '中文 循环 目录', seed: [], timeout: 600000, media: true, credential: true },
  restart:     { profile: '中文 循环 目录', seed: [], timeout: 300000, media: true },
  screenshots: { profile: '中文 循环 目录', seed: [], timeout: 60000, media: true },
};
const suitePlan = ['credential', 'models', 'download', 'listen', 'reopen', 'missing', 'cancel', 'cycle', 'failures', 'restart', 'screenshots'];

function parseOptions(values) {
  return Object.fromEntries(values.map(value => {
    const index = value.indexOf('=');
    return index < 0 ? [value, 'true'] : [value.slice(0, index), value.slice(index + 1)];
  }));
}

function isInside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function hasSymlinkComponent(target, boundary = root) {
  target = path.resolve(target);
  boundary = path.resolve(boundary);
  if (target !== boundary && !isInside(boundary, target)) return true;
  for (let current = target; ; current = path.dirname(current)) {
    try { if (fs.lstatSync(current).isSymbolicLink()) return true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current === boundary) return false;
    const parent = path.dirname(current);
    if (parent === current) return true;
  }
}

function cleanupProfile(target, evidence, { profileRoot = disposableRoot, custom = false, dryRun = false, rootBoundary = root } = {}) {
  target = path.resolve(target);
  evidence = path.resolve(evidence);
  profileRoot = path.resolve(profileRoot);
  if (custom) return { status: 'skipped', reason: 'custom profile', target };
  if (!isInside(profileRoot, target)) return { status: 'skipped', reason: 'outside disposable profile root', target };
  if (evidence === target || isInside(target, evidence)) return { status: 'skipped', reason: 'evidence is inside profile', target };
  if (hasSymlinkComponent(profileRoot, rootBoundary) || hasSymlinkComponent(target, rootBoundary)) return { status: 'skipped', reason: 'profile path contains a symlink', target };

  let rootStat;
  try { rootStat = fs.lstatSync(profileRoot); }
  catch (error) {
    if (error.code === 'ENOENT') return { status: 'absent', target };
    return { status: 'failed', reason: error.message, target };
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return { status: 'skipped', reason: 'profile root is not a real directory', target };

  let targetStat;
  try { targetStat = fs.lstatSync(target); }
  catch (error) {
    if (error.code === 'ENOENT') return { status: 'absent', target };
    return { status: 'failed', reason: error.message, target };
  }
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) return { status: 'skipped', reason: 'profile is not a real directory', target };
  if (dryRun) return { status: 'planned', target };

  try {
    fs.rmSync(target, { recursive: true, force: true });
    return { status: 'removed', target };
  } catch (error) {
    return { status: 'failed', reason: error.message, target };
  }
}

function prepareSuiteDirectory(suiteDir) {
  suiteDir = path.resolve(suiteDir);
  if (suiteDir === packageTestRoot || isInside(packageTestRoot, suiteDir)) throw new Error('Suite evidence must stay outside build/package-test');
  if (hasSymlinkComponent(suiteDir, path.parse(suiteDir).root)) throw new Error('Suite evidence path contains a symlink: ' + suiteDir);
  let stat;
  try { stat = fs.lstatSync(suiteDir); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.mkdirSync(suiteDir, { recursive: true });
    stat = fs.lstatSync(suiteDir);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Suite evidence path must be a real directory: ' + suiteDir);
  if (fs.readdirSync(suiteDir).length > 0) throw new Error('Suite evidence directory is not empty: ' + suiteDir);
  try {
    fs.writeFileSync(path.join(suiteDir, '.suite-owner.json'), JSON.stringify({ kind: 'inflow-packaged-suite-evidence', version: 1, createdAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
  } catch (error) {
    throw new Error('Suite evidence directory is already in use: ' + suiteDir + ' (' + error.message + ')');
  }
  return suiteDir;
}

function createSuiteOwnership({ baseRoot = suiteBaseRoot, rootBoundary = root } = {}) {
  baseRoot = path.resolve(baseRoot);
  rootBoundary = path.resolve(rootBoundary);
  if (baseRoot === rootBoundary || !isInside(rootBoundary, baseRoot)) throw new Error('Suite profile root must stay under the repository test root');
  if (hasSymlinkComponent(baseRoot, rootBoundary)) throw new Error('Suite profile root contains a symlink');
  fs.mkdirSync(baseRoot, { recursive: true });
  if (hasSymlinkComponent(baseRoot, rootBoundary)) throw new Error('Suite profile root contains a symlink');

  const suiteRoot = fs.mkdtempSync(path.join(baseRoot, 'suite-'));
  const profileRoot = path.join(suiteRoot, 'profiles');
  const markerPath = path.join(suiteRoot, 'owner.json');
  const marker = { kind: 'inflow-packaged-suite', version: 1, suiteId: path.basename(suiteRoot), profileRoot };
  fs.mkdirSync(profileRoot);
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), { flag: 'wx' });
  return { baseRoot, rootBoundary, suiteRoot, profileRoot, markerPath, marker };
}

function cleanupOwnedSuite(ownership, evidence, { dryRun = false } = {}) {
  const target = path.resolve(ownership.suiteRoot);
  const baseRoot = path.resolve(ownership.baseRoot);
  evidence = path.resolve(evidence);
  if (!isInside(baseRoot, target)) return { status: 'skipped', reason: 'suite root is outside its owner root', target };
  if (evidence === target || isInside(target, evidence)) return { status: 'skipped', reason: 'evidence is inside suite root', target };
  if (hasSymlinkComponent(baseRoot, ownership.rootBoundary) || hasSymlinkComponent(target, ownership.rootBoundary)) return { status: 'skipped', reason: 'suite path contains a symlink', target };

  let stat;
  try { stat = fs.lstatSync(target); }
  catch (error) { return { status: 'failed', reason: error.message, target }; }
  if (!stat.isDirectory() || stat.isSymbolicLink()) return { status: 'skipped', reason: 'suite root is not a real directory', target };

  let marker;
  try { marker = JSON.parse(fs.readFileSync(path.join(target, 'owner.json'), 'utf8')); }
  catch (error) { return { status: 'skipped', reason: 'suite ownership marker is missing or invalid: ' + error.message, target }; }
  const expectedProfileRoot = path.join(target, 'profiles');
  if (marker.kind !== ownership.marker.kind || marker.version !== ownership.marker.version || marker.suiteId !== ownership.marker.suiteId || path.resolve(marker.profileRoot) !== path.resolve(expectedProfileRoot) || path.resolve(ownership.profileRoot) !== path.resolve(expectedProfileRoot)) {
    return { status: 'skipped', reason: 'suite ownership marker does not match', target };
  }
  if (dryRun) return { status: 'planned', target };

  try {
    fs.rmSync(target, { recursive: true, force: false });
    return { status: 'removed', target };
  } catch (error) {
    return { status: 'failed', reason: error.message, target };
  }
}

function readResult(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error('Missing or invalid acceptance result: ' + file + ' (' + error.message + ')'); }
}

function suiteArgs(phase, suiteDir, options, media, profileRoot) {
  const args = [__filename, phase, path.join(suiteDir, phase)];
  if (options.exe) args.push('exe=' + path.resolve(options.exe));
  args.push('media=' + media);
  args.push('profileRoot=' + profileRoot);
  args.push('profile=' + path.join(profileRoot, phaseConfig[phase].profile));
  if (options.topic1) args.push('topic1=' + options.topic1);
  if (options.topic2) args.push('topic2=' + options.topic2);

  if (phase === 'reopen' || phase === 'missing') {
    const listen = readResult(path.join(suiteDir, 'listen', 'result.json'));
    args.push('expectedSentences=' + listen.sentenceCount);
    args.push('expectedIndex=' + listen.selectedIndex);
    args.push('expectedPosition=' + (listen.video?.currentTime || 0));
    args.push('mediaName=' + (options.mediaName || path.basename(media)));
  }
  if (phase === 'restart') args.push('expectedFile=' + path.join(suiteDir, 'cycle', 'result.json'));
  return args;
}

function writeSuiteSummary(suiteDir, summary, name = 'suite.json') {
  fs.mkdirSync(suiteDir, { recursive: true });
  fs.writeFileSync(path.join(suiteDir, name), JSON.stringify(summary, null, 2));
}

function spawnSuitePhase(args) {
  const phaseTimeout = phaseConfig[args[1]]?.timeout;
  const spawnOptions = {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  };
  if (phaseTimeout) spawnOptions.timeout = phaseTimeout + 60000;
  return spawnSync(process.execPath, args, spawnOptions);
}

function runSuite(suiteDir, options = {}, { spawnPhase = spawnSuitePhase, suiteRoot = suiteBaseRoot, rootBoundary = root } = {}) {
  const started = Date.now();
  const phases = [];
  let prepared = false;
  let ownership;
  try {
    if (options.profile) throw new Error('The suite owns its disposable profiles; run individual phases to use profile=...');
    suiteDir = prepareSuiteDirectory(suiteDir);
    prepared = true;
    const media = path.resolve(options.media || defaultMedia);

    if (options.dryRun === 'true') {
      const cleanup = options.keep === 'true' || options.cleanup === 'false'
        ? { status: 'preserved' }
        : { status: 'planned', target: path.join(path.resolve(suiteRoot), 'suite-<unique>') };
      writeSuiteSummary(suiteDir, { suite: true, dryRun: true, phases: suitePlan, cleanup, durationMs: Date.now() - started });
      console.log('Packaged acceptance dry run: ' + suitePlan.join(' -> '));
      return 0;
    }

    ownership = createSuiteOwnership({ baseRoot: suiteRoot, rootBoundary });
    for (const phase of suitePlan) {
      const result = spawnPhase(suiteArgs(phase, suiteDir, options, media, ownership.profileRoot));
      const passed = result.status === 0 && !result.error && !result.signal;
      phases.push({ phase, exitCode: result.status, signal: result.signal, error: result.error?.message || '', passed });
      if (!passed) {
        const summary = { suite: true, ok: false, phases, profileRoot: ownership.profileRoot, cleanup: { status: 'retained after failed phase' }, durationMs: Date.now() - started };
        writeSuiteSummary(suiteDir, summary);
        console.error('Packaged acceptance stopped after failed phase: ' + phase);
        return 1;
      }
    }

    const preserve = options.keep === 'true' || options.cleanup === 'false';
    const pendingCleanup = preserve
      ? { status: 'preserved', target: ownership.suiteRoot }
      : { status: 'pending', target: ownership.suiteRoot };
    if (preserve) {
      writeSuiteSummary(suiteDir, { suite: true, ok: true, phases, profileRoot: ownership.profileRoot, cleanup: pendingCleanup, durationMs: Date.now() - started });
      return 0;
    }
    writeSuiteSummary(suiteDir, { suite: true, ok: false, phases, profileRoot: ownership.profileRoot, cleanup: pendingCleanup, durationMs: Date.now() - started }, 'suite-precleanup.json');

    const cleanup = cleanupOwnedSuite(ownership, suiteDir);
    if (cleanup.status === 'removed') console.log('Removed owned packaged-suite profiles: ' + cleanup.target);
    else if (cleanup.status !== 'preserved') console.error('Cleanup ' + cleanup.status + ': ' + cleanup.target + (cleanup.reason ? ' (' + cleanup.reason + ')' : ''));
    const summary = { suite: true, ok: cleanup.status === 'removed' || cleanup.status === 'preserved', phases, profileRoot: ownership.profileRoot, cleanup, durationMs: Date.now() - started };
    try {
      writeSuiteSummary(suiteDir, summary);
    } catch (error) {
      console.error('Unable to record packaged acceptance cleanup: ' + error.message);
      return 1;
    }
    return summary.ok ? 0 : 1;
  } catch (error) {
    if (prepared) writeSuiteSummary(suiteDir, { suite: true, ok: false, phases, profileRoot: ownership?.profileRoot || null, error: error.message, cleanup: { status: 'retained after orchestration error' }, durationMs: Date.now() - started });
    console.error(error.message);
    return 1;
  }
}

function runPhase(phase, runDir, options) {
  const config = phaseConfig[phase];
  if (!config) { console.error('Unknown phase: ' + phase); return 2; }
  const exe = path.resolve(options.exe || path.join(root, 'build', 'package', 'Inflow-win32-x64', 'Inflow.exe'));
  const driver = path.join(root, 'scripts', 'verify-packaged-driver.cjs');
  if (!fs.existsSync(exe)) { console.error('Missing packaged exe: ' + exe); return 2; }
  fs.mkdirSync(runDir, { recursive: true });
  const profileRoot = path.resolve(options.profileRoot || disposableRoot);
  if (!isInside(packageTestRoot, profileRoot)) throw new Error('Profile roots must stay under build/package-test');
  const profile = path.resolve(options.profile || path.join(profileRoot, config.profile));
  if (isInside(profile, runDir)) throw new Error('Phase evidence must stay outside its profile');
  if (config.fresh && options.reuse !== 'true' && !isInside(profileRoot, profile)) throw new Error('Fresh profiles must stay under their profile root');
  if (hasSymlinkComponent(profileRoot) || (isInside(packageTestRoot, profile) && hasSymlinkComponent(profile))) throw new Error('Profile path contains a symlink');
  fs.mkdirSync(profile, { recursive: true });
  if (config.fresh && options.reuse !== 'true') {
    fs.rmSync(profile, { recursive: true, force: true });
  }

  // Seed models copied from the repository checkout so acceptance runs do not re-download ~1.8 GB;
  // the packaged app never references these paths itself (models are configured at userData/models).
  const modelsDir = path.join(profile, 'models');
  for (const name of config.seed.filter(name => !fs.existsSync(path.join(modelsDir, name)))) {
    fs.cpSync(path.join(repoModels, name), path.join(modelsDir, name), { recursive: true });
  }

  const media = options.media || defaultMedia;
  fs.rmSync(path.join(runDir, 'result.json'), { force: true });

  // For the missing phase, delete the managed media copy after the listen phase saved it.
  if (config.deleteMedia) {
    const managed = path.join(profile, 'media');
    const entries = fs.readdirSync(managed);
    const file = entries.find(entry => fs.statSync(path.join(managed, entry)).isFile());
    if (file) {
      fs.rmSync(path.join(managed, file));
      console.log('Deleted managed media: ' + file);
    }
  }

  function orphanWorkers() {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq media_processor.exe" /FO CSV /NH', { encoding: 'utf8' });
      return output.split('\n').filter(line => line.toLowerCase().includes('media_processor')).length;
    } catch { return -1; }
  }

  const launchEnv = {};
  for (const key of ['SystemRoot', 'windir', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMFILES', 'COMMONPROGRAMFILES', 'NUMBER_OF_PROCESSORS', 'OS', 'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL', 'PROCESSOR_REVISION', 'COMPUTERNAME', 'USERNAME', 'USERDOMAIN', 'DRIVERDATA', 'ELECTRON_RUN_AS_NODE']) {
    if (process.env[key] !== undefined) launchEnv[key] = process.env[key];
  }
  launchEnv.INFLOW_DESKTOP_DRIVER = driver;
  launchEnv.PATH = path.join(process.env.SystemRoot, 'System32') + ';' + process.env.SystemRoot;
  launchEnv.INFLOW_VERIFY_PHASE = phase;
  launchEnv.INFLOW_VERIFY_OUT = runDir;
  launchEnv.INFLOW_VERIFY_MEDIA = media;
  launchEnv.INFLOW_VERIFY_PROFILE = profile;
  if (config.credential) {
    launchEnv.INFLOW_VERIFY_CREDENTIAL = process.env.INFLOW_VERIFY_CREDENTIAL || process.env.DEEPSEEK_API_KEY || '';
    if (!launchEnv.INFLOW_VERIFY_CREDENTIAL) { console.error('Set DEEPSEEK_API_KEY or INFLOW_VERIFY_CREDENTIAL'); return 2; }
  }
  const extra = {};
  if (options.expectedFile) extra.expected = JSON.parse(fs.readFileSync(path.resolve(options.expectedFile), 'utf8'));
  if (phase === 'reopen' || phase === 'restart' || phase === 'missing') {
    extra.expectedSentences = Number(options.expectedSentences || 0);
    extra.expectedIndex = Number(options.expectedIndex || 0);
    extra.expectedPosition = Number(options.expectedPosition || 0);
  }
  if (phase === 'missing' || phase === 'reopen') extra.mediaName = options.mediaName || '';
  if (phase === 'cycle') { extra.topic1 = options.topic1 || '친구와 함께한 타이완 여행'; extra.topic2 = options.topic2 || '퇴근 후의 조용한 저녁'; }
  launchEnv.INFLOW_VERIFY_EXTRA = JSON.stringify(extra);

  console.log('Launching packaged Inflow (' + phase + ') profile=' + profile);
  const child = spawn(exe, [], { cwd: path.dirname(exe), env: launchEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  child.stdout.on('data', () => { /* discard renderer noise */ });
  const timer = setTimeout(() => { console.error('Phase timed out, killing app'); try { child.kill(); } catch { /* ignore */ } }, config.timeout);
  const started = Date.now();
  child.on('exit', (code) => {
    clearTimeout(timer);
    const waitSeconds = 6;
    let orphans = -1;
    for (let i = 0; i < waitSeconds; i++) {
      orphans = orphanWorkers();
      if (orphans === 0) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    const resultPath = path.join(runDir, 'result.json');
    let result = {};
    try { result = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch { /* driver may have failed before writing */ }
    const summary = {
      phase, exitCode: code, durationMs: Date.now() - started, orphanWorkerProcesses: orphans,
      stderrTail: stderr.slice(-2000), driverOk: result.ok === true && code === 0,
      failedChecks: (result.checks || []).filter(entry => !entry.ok),
    };
    fs.writeFileSync(path.join(runDir, 'launch-' + phase + '.json'), JSON.stringify(summary, null, 2));
    console.log('exit=' + code + ' driverOk=' + summary.driverOk + ' orphans=' + orphans + ' duration=' + Math.round(summary.durationMs / 1000) + 's');
    const passed = summary.driverOk && orphans === 0;
    if (passed && options.cleanup === 'true' && options.keep !== 'true') {
      const cleanup = cleanupProfile(profile, runDir, { profileRoot, custom: Boolean(options.profile) });
      if (cleanup.status === 'removed') console.log('Removed disposable test profile: ' + cleanup.target);
      else if (cleanup.status !== 'absent') console.error('Cleanup ' + cleanup.status + ': ' + cleanup.target + (cleanup.reason ? ' (' + cleanup.reason + ')' : ''));
    }
    process.exit(passed ? 0 : 1);
  });
}

function main(argv = process.argv.slice(2)) {
  const phase = argv[0];
  const runDir = path.resolve(argv[1] || '');
  const options = parseOptions(argv.slice(2));
  if (phase === 'suite') return runSuite(runDir, options);
  return runPhase(phase, runDir, options);
}

if (require.main === module) {
  const result = main();
  if (Number.isInteger(result)) process.exitCode = result;
}

module.exports = {
  cleanupProfile,
  cleanupOwnedSuite,
  createSuiteOwnership,
  isInside,
  main,
  phaseConfig,
  runSuite,
  suiteArgs,
  suitePlan,
};
