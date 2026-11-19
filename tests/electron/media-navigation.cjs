/* eslint @typescript-eslint/no-require-imports: off -- Isolated production bridge and SQLite regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, 'test-results/electron');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'media-navigation-'));
    const wav = Buffer.alloc(44 + 8000 * 3 * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
    for (const name of ['First.wav', 'Second.wav', 'Third.wav']) await fs.writeFile(path.join(output, name), wav);
    for (const phase of ['initial', 'restart']) {
      const env = { ...process.env, DEEPSEEK_API_KEY: '' }; delete env.ELECTRON_RUN_AS_NODE;
      await new Promise((resolve, reject) => {
        const child = require('node:child_process').spawn(require('electron'), [__filename, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}; evidence: ${output}`)));
      });
      await fs.access(path.join(output, phase + '.json'));
    }
    console.log('PASS: native media navigation and restore. Evidence: ' + output);
    return;
  }

  const { app, BrowserWindow, ipcMain, protocol } = require('electron');
  const { DatabaseSync } = require('node:sqlite');
  const output = process.argv[2], phase = process.argv[3], profile = path.join(output, 'profile');
  app.setPath('userData', profile);
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  protocol.registerSchemesAsPrivileged = () => {};
  app.on('browser-window-created', (_event, window) => { window.hide(); window.webContents.setBackgroundThrottling(false); });
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  let transcriptions = 0;
  const processor = async mode => {
    if (mode === 'probe') return { duration: 3 };
    if (mode === 'transcribe') { transcriptions++; return { segments: [{ start: 0, end: 3, text: 'Hello world.', groups: ['Hello', ' world.'] }] }; }
    return { surface: 'Hello', lemma: 'hello', language: 'en', candidates: [], meaningZh: '你好' };
  };
  let seed;
  if (phase === 'initial') {
    const ops = new DesktopOperations(profile, processor);
    try {
      ops.saveSettings({ interfaceLocale: 'en' });
      const media = [];
      for (const name of ['First.wav', 'Second.wav', 'Third.wav']) media.push(await ops.transcribe((await ops.importMedia(path.join(output, name), 'en')).id, 'seed-' + media.length));
      const [first, second] = media;
      const word = ops.saveVocabulary({ language: 'en', lemma: 'hello', meaningZh: '你好', note: 'Original note', context: {
        surface: 'Hello', surfaceStart: 0, sentence: second.segments[0].text,
        source: { type: 'media', mediaId: second.id, segmentId: second.segments[0].id, name: second.name, start: 0 },
      } });
      ops.open(first.id);
      seed = { media, word }; await fs.writeFile(path.join(output, 'seed.json'), JSON.stringify(seed));
    } finally { ops.close(); }
    transcriptions = 0;
  } else seed = JSON.parse(await fs.readFile(path.join(output, 'seed.json'), 'utf8'));
  const [first, second, third] = seed.media;
  require(path.join(root, 'build/desktop/src/listening/media-server.js')).runProcessor = processor;
  const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
  GenerationCredential.prototype.initialize = async function () {};
  GenerationCredential.prototype.status = () => ({ configured: false });
  let gated = null, failList = false;
  const register = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => register(channel, async (event, ...args) => {
    if (channel === 'inflow:list' && failList) { failList = false; throw new Error('Fixture library refresh failure'); }
    const result = await handler(event, ...args);
    if (channel === 'inflow:readMedia' && gated && args[0] === gated.id) {
      const gate = gated; gate.started = true; await gate.promise;
    }
    return result;
  });
  function gate(id) {
    const entry = { id, started: false };
    entry.promise = new Promise(resolve => { entry.release = resolve; });
    gated = entry; return entry;
  }
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let i = 0; i < 200; i++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error(`Timed out: ${code}; body: ${await evaluate('document.body.innerText')}`);
  }
  const click = (selector, text) => evaluate(`(() => { const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); })()`);
  const field = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  async function waitGate(entry) { for (let i = 0; i < 200 && !entry.started; i++) await delay(25); assert.ok(entry.started); }
  const database = new DatabaseSync(path.join(profile, 'learning.sqlite'));
  try {
    await wait('!!document.querySelector(".workspace-audio-card")');
    if (phase === 'restart') {
      assert.equal((await evaluate('window.inflow.restore()')).id, third.id);
      assert.match(await evaluate('document.querySelector(".workspace-audio-card").textContent'), /Third.wav/);
    } else {
      await click('.workspace-topnav button', 'Vocab');
      await wait('!!document.querySelector(".vocab-context-card .vocab-open-source")');
      const pending = gate(second.id);
      await evaluate('document.querySelector(".vocab-context-card .vocab-open-source").click()');
      await waitGate(pending);
      await evaluate('document.querySelector(".vocab-notes-section summary").click()');
      await field('.vocab-notes-section textarea', 'Draft note');
      await click('.vocab-notes-section button', 'Cancel');
      pending.release(); await delay(200); gated = null;
      assert.equal((await evaluate('window.inflow.restore()')).id, first.id);
      assert.equal(await evaluate('document.querySelector(".workspace-vocab").hidden'), false);
      const superseded = gate(second.id);
      await evaluate('document.querySelector(".vocab-context-card .vocab-open-source").click()');
      await waitGate(superseded);
      database.exec("CREATE TRIGGER reject_media_selection BEFORE UPDATE ON settings WHEN NEW.key = 'active' BEGIN SELECT RAISE(ABORT, 'Fixture selection failure'); END");
      await click('.workspace-topnav button', 'Library');
      await wait('document.querySelector(".workspace-library-dialog")?.open');
      await evaluate(`[...document.querySelectorAll('.workspace-library-item')].find(el => el.textContent.includes('Third.wav')).click()`);
      await wait('document.querySelector(".app-notice-stack")?.textContent.includes("Fixture selection failure")');
      assert.equal((await evaluate('window.inflow.restore()')).id, first.id);
      superseded.release(); await delay(200); gated = null;
      assert.equal((await evaluate('window.inflow.restore()')).id, first.id);
      database.exec('DROP TRIGGER reject_media_selection');
      await click('.workspace-topnav button', 'Library');
      await wait('document.querySelector(".workspace-library-dialog")?.open');
      await evaluate(`[...document.querySelectorAll('.workspace-library-item')].find(el => el.textContent.includes('Third.wav')).click()`);
      await wait('document.querySelector(".workspace-audio-card")?.textContent.includes("Third.wav")');
      assert.equal((await evaluate('window.inflow.restore()')).id, third.id);
      await wait('[...document.querySelectorAll(".workspace-status button")].some(b => b.textContent === "Process again" && !b.disabled)');
      await evaluate('window.confirm = message => { window.confirmation = message; return false; }; void 0');
      await click('.workspace-status button', 'Process again');
      assert.equal(transcriptions, 0);
      assert.match(await evaluate('window.confirmation'), /vocabulary links and positions.*cached translations.*group masks.*Words and notes are kept/);
      failList = true;
      await evaluate('window.confirm = () => true; void 0');
      await click('.workspace-status button', 'Process again');
      await wait('document.querySelector(".app-notice-stack")?.textContent.includes("Fixture library refresh failure")');
      assert.equal(transcriptions, 1);
      assert.equal(await evaluate('[...document.querySelectorAll(".workspace-status button")].some(b => b.textContent === "Retry processing")'), false);
      await click('.workspace-topnav button', 'Library');
      await wait('document.querySelector(".workspace-library-dialog")?.open');
      await click('.workspace-library-dialog button', 'Retry loading library');
      await wait('![...document.querySelectorAll(".workspace-library-dialog button")].some(b => b.textContent === "Retry loading library")');
      assert.equal(transcriptions, 1);
      assert.equal((await evaluate('window.inflow.listVocabulary()'))[0].note, 'Original note');
      assert.equal((await evaluate('window.inflow.restore()')).id, third.id);
    }
    await fs.writeFile(path.join(output, phase + '.json'), JSON.stringify({ phase, restored: third.id }));
  } catch (error) {
    await fs.writeFile(path.join(output, phase + '-failure.json'), JSON.stringify({ error: error.stack || String(error) }, null, 2));
    throw error;
  } finally { database.close(); app.quit(); }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
