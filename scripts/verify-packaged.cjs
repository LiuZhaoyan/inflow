#!/usr/bin/env node
// Outer orchestrator for packaged-app acceptance runs. Launches build/package/Inflow-win32-x64/Inflow.exe
// with the INFLOW_DESKTOP_DRIVER seam, a hermetic profile (optionally Chinese/spaced), a minimal
// environment without any development paths, and records evidence + orphan-process checks.
// Usage: node scripts/verify-packaged.cjs <phase> <runDir> [option=value ...]
// Phases: credential models download listen reopen missing cancel cycle failures restart screenshots
// Use cleanup=true on the LAST phase of a suite to delete its default disposable test profiles
// after success; failures retain profiles for debugging. Use keep=true to preserve them.
const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const phase = process.argv[2];
const runDir = path.resolve(process.argv[3] || '');
const options = Object.fromEntries(process.argv.slice(4).map(value => {
  const index = value.indexOf('=');
  return [value.slice(0, index), value.slice(index + 1)];
}));

const root = path.resolve(__dirname, '..');
const exe = path.resolve(options.exe || path.join(root, 'build', 'package', 'Inflow-win32-x64', 'Inflow.exe'));
const driver = path.join(root, 'scripts', 'verify-packaged-driver.cjs');
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
const config = phaseConfig[phase];
if (!config) { console.error('Unknown phase: ' + phase); process.exit(2); }
if (!fs.existsSync(exe)) { console.error('Missing packaged exe: ' + exe); process.exit(2); }
fs.mkdirSync(runDir, { recursive: true });
const profile = path.resolve(options.profile || path.join(root, 'build', 'package-test', 'profiles', config.profile));
fs.mkdirSync(profile, { recursive: true });
if (config.fresh && options.reuse !== 'true') {
  if (!profile.startsWith(path.join(root, 'build', 'package-test') + path.sep)) throw new Error('Fresh profiles must stay under build/package-test');
  fs.rmSync(profile, { recursive: true, force: true });
}

// Seed models copied from the repository checkout so acceptance runs do not re-download ~1.8 GB;
// the packaged app never references these paths itself (models are configured at userData/models).
const modelsDir = path.join(profile, 'models');
for (const name of config.seed.filter(name => !fs.existsSync(path.join(modelsDir, name)))) {
  fs.cpSync(path.join(repoModels, name), path.join(modelsDir, name), { recursive: true });
}

const media = options.media || defaultMedia;
const out = runDir;
fs.rmSync(path.join(out, 'result.json'), { force: true });

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
launchEnv.INFLOW_VERIFY_OUT = out;
launchEnv.INFLOW_VERIFY_MEDIA = media;
launchEnv.INFLOW_VERIFY_PROFILE = profile;
if (config.credential) {
  launchEnv.INFLOW_VERIFY_CREDENTIAL = process.env.INFLOW_VERIFY_CREDENTIAL || process.env.DEEPSEEK_API_KEY || '';
  if (!launchEnv.INFLOW_VERIFY_CREDENTIAL) { console.error('Set DEEPSEEK_API_KEY or INFLOW_VERIFY_CREDENTIAL'); process.exit(2); }
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
  const resultPath = path.join(out, 'result.json');
  let result = {};
  try { result = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch { /* driver may have failed before writing */ }
  const summary = {
    phase, exitCode: code, durationMs: Date.now() - started, orphanWorkerProcesses: orphans,
    stderrTail: stderr.slice(-2000), driverOk: result.ok === true && code === 0,
    failedChecks: (result.checks || []).filter(entry => !entry.ok),
  };
  fs.writeFileSync(path.join(out, 'launch-' + phase + '.json'), JSON.stringify(summary, null, 2));
  console.log('exit=' + code + ' driverOk=' + summary.driverOk + ' orphans=' + orphans + ' duration=' + Math.round(summary.durationMs / 1000) + 's');
  const passed = summary.driverOk && orphans === 0;
  if (passed && options.cleanup === 'true' && options.keep !== 'true') {
    const disposableRoot = path.join(root, 'build', 'package-test', 'profiles');
    const target = path.resolve(profile);
    const evidence = path.resolve(out);
    if (options.profile || !target.startsWith(disposableRoot + path.sep) ||
        evidence === target || evidence.startsWith(target + path.sep)) {
      console.error('Cleanup skipped: custom profile or evidence inside profile.');
    } else {
      try {
        fs.rmSync(target, { recursive: true, force: true });
        console.log('Removed disposable test profile: ' + target);
      } catch (error) {
        console.error('Cleanup failed, profile retained: ' + error.message);
      }
    }
  }
  process.exit(passed ? 0 : 1);
});
