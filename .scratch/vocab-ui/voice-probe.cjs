/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron pronunciation probe. */
// Probe the existing Electron runtime without opening the app or its learning database.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function run() {
  if (!process.versions.electron) {
    const executable = process.argv[2];
    assert.ok(executable, 'Pass the path to the existing electron.exe');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    return new Promise((resolve, reject) => {
      const child = require('node:child_process').spawn(executable, [__filename], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Voice probe exited ${code}`)));
    });
  }
  const { app, BrowserWindow, protocol } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true } }]);
  const fsSync = require('node:fs');
  fsSync.mkdirSync(path.resolve(__dirname, '../desktop-learning/generated-samples'), { recursive: true });
  const output = fsSync.mkdtempSync(path.resolve(__dirname, '../desktop-learning/generated-samples/vocab-voice-'));
  app.setPath('userData', path.join(output, 'profile'));
  await app.whenReady();
  protocol.handle('inflow', () => new Response('<!doctype html><title>Voice probe</title>', {
    headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'none'" },
  }));
  const window = new BrowserWindow({ show: false, webPreferences: {
    contextIsolation: true, nodeIntegration: false, sandbox: true, offscreen: true, backgroundThrottling: false,
  } });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  try {
    await window.loadURL('inflow://app/');
    const voices = await window.webContents.executeJavaScript(`new Promise(resolve => {
      const timer = setTimeout(finish, 5000);
      const synth = window.speechSynthesis;
      const changed = () => { if (synth.getVoices().length) finish(); };
      function finish() {
        clearTimeout(timer); synth.removeEventListener('voiceschanged', changed);
        resolve(synth.getVoices().map(voice => ({ name: voice.name, lang: voice.lang, local: voice.localService, default: voice.default })));
      }
      synth.addEventListener('voiceschanged', changed);
      if (synth.getVoices().length) finish();
    })`, true);
    console.log(JSON.stringify({ electron: process.versions.electron, chrome: process.versions.chrome, voices }, null, 2));
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ electron: process.versions.electron, chrome: process.versions.chrome, voices }, null, 2));
    console.log(`Voice enumeration evidence: ${output}`);
    for (const language of ['en', 'ko']) {
      assert.ok(voices.some(voice => voice.local && voice.lang.split('-')[0] === language), `Missing local ${language} voice`);
    }
    const results = await window.webContents.executeJavaScript(`(async () => {
      const results = [];
      for (const [language, text] of [['en', 'learn'], ['ko', '배우다']]) {
        results.push(await new Promise(resolve => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = speechSynthesis.getVoices().find(voice => voice.localService && voice.lang.split('-')[0] === language);
          utterance.lang = utterance.voice.lang;
          utterance.volume = 0;
          let started = false;
          const timer = setTimeout(() => { speechSynthesis.cancel(); resolve({ language, started, status: 'timeout' }); }, 10000);
          utterance.onstart = () => { started = true; };
          utterance.onend = () => { clearTimeout(timer); resolve({ language, started, status: 'end' }); };
          utterance.onerror = event => { clearTimeout(timer); resolve({ language, started, status: event.error }); };
          speechSynthesis.speak(utterance);
        }));
      }
      return results;
    })()`, true);
    console.log(JSON.stringify({ mutedSpeech: results }, null, 2));
    for (const result of results) { assert.equal(result.status, 'end'); assert.equal(result.started, true); }
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ voices, mutedSpeech: results }, null, 2));
    console.log(`PASS: local English/Korean voices and muted synthesis events. Evidence: ${output}`);
  } finally { window.destroy(); app.quit(); }
}

run().catch(error => {
  console.error(error);
  if (process.versions.electron) require('electron').app.exit(1);
  else process.exitCode = 1;
});
