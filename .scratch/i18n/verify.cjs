/* eslint @typescript-eslint/no-require-imports: off -- Isolated Electron and browser acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'i18n-native-'));
    require('node:child_process').execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=640x360:d=6', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:v', 'libvpx', '-c:a', 'libvorbis', path.join(output, 'sample.webm')], { windowsHide: true });
    for (const phase of ['initial', 'restart', 'browser', 'import']) {
      const env = { ...process.env, DEEPSEEK_API_KEY: '' }; delete env.ELECTRON_RUN_AS_NODE;
      await new Promise((resolve, reject) => {
        const child = require('node:child_process').spawn(require('electron'), [__filename, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}; evidence: ${output}`)));
      });
    }
    console.log(`PASS: bilingual desktop, restart and browser acceptance. Evidence: ${output}`);
    return;
  }

  const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
  const output = process.argv[2], phase = process.argv[3];
  const profile = path.join(output, phase === 'browser' ? 'browser-profile' : 'profile');
  app.setPath('userData', profile);
  const errors = [], dialogs = [];
  let window, ops, server, failLocale = false, failKey = false, processingFailure = null;
  const processor = async mode => {
    if (mode === 'transcribe' && processingFailure) throw processingFailure;
    return mode === 'probe' ? { duration: 6 } : mode === 'transcribe'
    ? { segments: [{ start: 0, end: 3, text: '배가 있어요.', groups: ['배가', ' 있어요.'] }, { start: 3, end: 6, text: '집에 가요.', groups: ['집에', ' 가요.'] }] }
    : mode === 'models' ? { whisper: true, translate: { 'ko-en': true, 'en-zh': true }, englishParser: true }
    : mode === 'translate' ? { translation: '有一条船。' } : { surface: '배', lemma: '배', language: 'ko', candidates: [], meaningZh: '船' };
  };
  const generator = async input => ({ title: 'A saved walk', requestedModel: 'deepseek-flash', sentences: [
    { parts: [{ text: 'I ', targetId: null }, { text: 'walk', targetId: input.targets[0].id }, { text: ' home.', targetId: null }], translationZh: '我走回家。' },
    { parts: [{ text: 'Home is quiet.', targetId: null }], translationZh: '家很安静。' },
  ] });
  let seed;
  if (phase !== 'browser') {
    protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
    protocol.registerSchemesAsPrivileged = () => {};
    const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
    ops = new DesktopOperations(profile, processor, generator);
    if (phase === 'initial') {
      ops.saveSettings({ interfaceLocale: 'en', videoMaskColor: '#123456' });
      const media = await ops.transcribe((await ops.importMedia(path.join(output, 'sample.webm'), 'ko')).id, 'fixture');
      const boat = ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '船', note: 'Keep this note', context: { surface: '배', surfaceStart: 0, sentence: media.segments[0].text, source: { type: 'media', mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: 0 } } });
      const walk = ops.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '步行' });
      ops.selectVocabulary([boat.id, walk.id]);
      const story = await ops.generateArtifact([walk.id], '', 'fixture-story', 'fixture-key');
      ops.open(media.id);
      ops.saveLearning(media.id, { position: 1.25, index: 0, rate: 1.25, loop: true, duration: 6, mode: 'sentence', masks: { [media.segments[0].id]: [0] }, videoMask: { enabled: true, x: 0.1, y: 0.7, width: 0.8, height: 0.15 } });
      seed = { media: ops.get(media.id), boat, walk, story };
      await fs.writeFile(path.join(output, 'seed.json'), JSON.stringify(seed));
    } else seed = JSON.parse(await fs.readFile(path.join(output, 'seed.json'), 'utf8'));
    const mediaServer = require(path.join(root, 'build/desktop/src/listening/media-server.js'));
    mediaServer.runProcessor = processor;
    const credentials = require(path.join(root, 'build/desktop/desktop/credentials.js'));
    const initialize = credentials.GenerationCredential.prototype.initialize;
    credentials.GenerationCredential.prototype.initialize = function () { return initialize.call(this, profile); };
    const register = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = (channel, handler) => register(channel, (event, ...args) => {
      if (channel === 'inflow:saveSettings' && args[0].interfaceLocale && failLocale) throw new Error('Fixture preference failure');
      if (channel === 'inflow:configureCredential' && failKey) throw new Error('Fixture credential failure');
      return handler(event, ...args);
    });
    dialog.showOpenDialog = async (_window, options) => { dialogs.push(options); return { canceled: false, filePaths: [path.join(output, 'sample.webm')] }; };
    dialog.showMessageBox = async (_window, options) => { dialogs.push(options); return { response: 2 }; };
    global.fetch = async () => { throw new Error('Acceptance must not contact a provider'); };
    app.on('browser-window-created', (_event, created) => { created.hide(); created.webContents.setBackgroundThrottling(false); });
    require(path.join(root, 'build/desktop/desktop/main.js'));
    await app.whenReady();
    window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  } else {
    await app.whenReady();
    server = require('node:http').createServer(async (request, response) => {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, 'build/renderer', '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      const base = path.join(root, 'build/renderer');
      if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
      try {
        const body = await fs.readFile(file);
        response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
        response.end(body);
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    window = new BrowserWindow({ show: false, width: 1200, height: 800 });
    await window.loadURL(`http://127.0.0.1:${server.address().port}`);
  }
  window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let n = 0; n < 160; n++) { if (await evaluate(code)) return; await delay(75); }
    await fs.writeFile(path.join(output, `${phase}-failure.png`), (await window.webContents.capturePage()).toPNG());
    throw new Error(`Timed out: ${code}; ${await evaluate('document.body.innerText.slice(0, 1800)')}`);
  }
  async function click(selector, text = '') {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.includes(${JSON.stringify(text)})); if (!el || el.disabled) return false; el.click(); return true; })()`), `${selector}: ${text}`);
    await delay(70);
  }
  async function field(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing field'); const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); })()`);
    await delay(70);
  }
  async function languageDraft(locale) {
    await click('.workspace-settings-nav button');
    await click('[aria-controls=settings-language-panel]');
    await field('#settings-interface-language', locale);
  }
  async function switchLanguage(locale) {
    await languageDraft(locale);
    await click('.workspace-settings-dialog button[type=submit]');
    await wait(`document.documentElement.lang === ${JSON.stringify(locale)} && !document.querySelector('.workspace-settings-dialog')`);
  }
  async function screenshot(name) { await fs.writeFile(path.join(output, name + '.png'), (await window.webContents.capturePage()).toPNG()); }
  try {
    await wait('!!document.querySelector(".workspace-settings-nav button")');
    if (phase === 'restart') {
      await wait('document.documentElement.lang === "zh-CN" && !!document.querySelector("video")');
      assert.equal(ops.getSettings().interfaceLocale, 'zh-CN');
      assert.equal(await evaluate('document.querySelector(".workspace-settings-nav button").textContent'), '设置');
      assert.deepEqual(ops.listVocabulary(), JSON.parse(await fs.readFile(path.join(output, 'expected-vocabulary.json'), 'utf8')));
      assert.deepEqual(ops.listArtifacts(), [seed.story]);
      assert.deepEqual(ops.get(seed.media.id).segments, seed.media.segments);
    } else if (phase === 'import') {
      await wait('document.documentElement.lang === "zh-CN" && !!document.querySelector(".workspace-topnav")');
      const before = ops.list().length;
      await click('.workspace-topnav nav button', '资料库');
      await click('.workspace-library-footer button', '导入媒体');
      await wait('!!document.querySelector(".workspace-source-language-dialog[open]")');
      assert.ok(await evaluate('document.activeElement.classList.contains("workspace-source-language-dialog")'), 'no default language selection');
      assert.deepEqual(await evaluate('[...document.querySelectorAll(".workspace-source-language-option")].map(node => node.textContent.trim())'), ['한국어', 'English']);
      await screenshot('source-language-chinese');
      window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
      await wait('!document.querySelector(".workspace-source-language-dialog")');
      assert.equal(ops.list().length, before, 'Escape does not import');
      await click('.workspace-library-footer button', '导入媒体');
      await wait('!!document.querySelector(".workspace-source-language-dialog[open]")');
      await click('.workspace-source-language-option[lang=en]');
      await wait('window.inflow.list().then(items => items.length === 2)');
      assert.equal(ops.list().length, before + 1, 'click immediately imports');
      assert.ok(ops.list().some(item => item.language === 'en'), 'English import is present');
      assert.equal(ops.getImportLanguage(), 'en');
      assert.equal(await evaluate('!!document.querySelector(".workspace-source-language-dialog")'), false);
      await screenshot('source-language-complete');
    } else if (phase === 'browser') {
      assert.equal(await evaluate('!!window.inflow'), false);
      await switchLanguage('en');
      await languageDraft('zh-CN'); await click('.workspace-settings-cancel');
      assert.equal(await evaluate('document.documentElement.lang'), 'en');
      await evaluate('window.originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error("Fixture browser storage failure"); }; void 0;');
      await languageDraft('zh-CN'); await click('.workspace-settings-dialog button[type=submit]');
      await wait('document.querySelector(".workspace-settings-dialog [role=alert]")?.textContent.includes("Fixture browser storage failure")');
      assert.equal(await evaluate('document.documentElement.lang'), 'en');
      assert.equal(await evaluate('document.querySelector("#settings-interface-language").value'), 'zh-CN');
      await evaluate('Storage.prototype.setItem = originalStorageSet; void 0;');
      await click('.workspace-settings-dialog button[type=submit]');
      await wait('document.documentElement.lang === "zh-CN" && !document.querySelector(".workspace-settings-dialog")');
      await new Promise(resolve => { window.webContents.once('did-finish-load', resolve); window.reload(); });
      await wait('document.documentElement.lang === "zh-CN" && document.querySelector(".workspace-settings-nav button")?.textContent === "设置"');
      assert.equal(await evaluate('localStorage.getItem("inflow.interfaceLocale")'), 'zh-CN');
      await screenshot('browser-chinese');
    } else {
      await wait('document.documentElement.lang === "en" && document.querySelector("video")?.readyState >= 1');
      const snapshot = () => evaluate(`({ position: document.querySelector('video').currentTime, rate: document.querySelector('video').playbackRate, sentence: document.querySelector('.workspace-sentence-text').textContent, mask: document.querySelector('.workspace-video-mask').getAttribute('style'), selected: [...document.querySelectorAll('.vocab-row[aria-pressed=true]')].map(el => el.dataset.entryId) })`);
      const before = await snapshot();
      await languageDraft('zh-CN');
      assert.equal(await evaluate('document.documentElement.lang'), 'en');
      await click('.workspace-settings-cancel');
      assert.equal(ops.getSettings().interfaceLocale, 'en');
      await switchLanguage('zh-CN');
      assert.deepEqual(await snapshot(), before);
      assert.equal(await evaluate('document.querySelector(".workspace-sentence-text").lang'), 'ko');
      await screenshot('listen-chinese');
      await click('.workspace-topnav nav button', '资料库');
      await click('.workspace-library-footer button', '导入媒体');
      await wait('!!document.querySelector(".workspace-source-language-dialog[open]")');
      assert.equal(await evaluate('document.querySelector("#source-language-title").textContent'), '选择素材语言');
      assert.deepEqual(await evaluate('[...document.querySelectorAll(".workspace-source-language-option")].map(button => button.textContent.trim())'), ['한국어', 'English']);
      assert.ok(dialogs.at(-1).filters[0].name.includes('音频'));
      await click('.workspace-source-language-cancel');
      await wait('!document.querySelector(".workspace-source-language-dialog")');
      assert.equal(ops.getImportLanguage(), 'ko');
      const invalid = await evaluate('window.inflow.saveSettings({ interfaceLocale: "ko" }).then(() => "unexpected success", failure => failure.message)');
      assert.ok(invalid.includes('简体中文'));
      assert.equal(ops.getSettings().interfaceLocale, 'zh-CN');
      await evaluate(`window.inflow.relink(${JSON.stringify(seed.media.id)})`);
      assert.ok(dialogs.at(-1).title.includes('关联'));
      failLocale = true;
      await languageDraft('en'); await click('[aria-controls=settings-subtitles-panel]'); await field('#settings-mask-color', '#abcdef');
      await click('.workspace-settings-dialog button[type=submit]');
      await wait('document.querySelector(".workspace-settings-dialog [role=alert]")?.textContent.includes("Fixture preference failure")');
      assert.equal(await evaluate('document.documentElement.lang'), 'zh-CN');
      assert.equal(await evaluate('document.querySelector("#settings-interface-language").value'), 'en');
      assert.equal(ops.getSettings().videoMaskColor, '#abcdef');
      failLocale = false; await click('.workspace-settings-dialog button[type=submit]'); await wait('document.documentElement.lang === "en" && !document.querySelector(".workspace-settings-dialog")');
      await click('.workspace-topnav nav button', 'Library');
      await click('.workspace-library-footer button', 'Import media');
      await wait('!!document.querySelector(".workspace-source-language-dialog[open]")');
      assert.equal(await evaluate('document.querySelector("#source-language-title").textContent'), 'Choose source language');
      assert.deepEqual(await evaluate('[...document.querySelectorAll(".workspace-source-language-option")].map(button => button.textContent.trim())'), ['한국어', 'English']);
      await click('.workspace-source-language-cancel');
      await click('.workspace-topnav nav button', 'Library'); await click('.workspace-library-item', 'A saved walk');
      await wait('document.querySelector(".story-sentences")?.checkVisibility()');
      const storyBefore = await evaluate('document.querySelector(".story-sentences").textContent');
      await screenshot('story-english'); await switchLanguage('zh-CN');
      assert.equal(await evaluate('document.querySelector(".story-sentences").textContent'), storyBefore);
      assert.ok(await evaluate('document.querySelector(".story-hero time").textContent.includes("年")'));
      await click('.story-reader-footer button[aria-pressed]');
      assert.equal(await evaluate('document.querySelector(".story-translation").textContent'), '我走回家。');
      await screenshot('story-chinese');
      await click('.workspace-topnav nav button', '词汇'); await wait('document.querySelector("#notebook")?.checkVisibility()');
      await screenshot('vocab-chinese');
      await switchLanguage('en'); await screenshot('vocab-english');
      await languageDraft('zh-CN'); await click('[aria-controls=settings-llm-panel]'); await field('#settings-api-key', 'fixture-key');
      failKey = true; await click('.workspace-settings-dialog button[type=submit]');
      await wait('document.documentElement.lang === "zh-CN" && !!document.querySelector(".workspace-settings-dialog [role=alert]")');
      assert.equal(ops.getSettings().interfaceLocale, 'zh-CN');
      assert.equal(await evaluate('document.querySelector("#settings-api-key").value'), 'fixture-key');
      failKey = false; await click('.workspace-settings-dialog button[type=submit]'); await wait('!document.querySelector(".workspace-settings-dialog")');
      await languageDraft('en'); await screenshot('settings-chinese');
      window.setContentSize(520, 650); await delay(150); await screenshot('settings-narrow');
      assert.ok(await evaluate('(() => { const dialog = document.querySelector(".workspace-settings-dialog").getBoundingClientRect(); return dialog.left >= 0 && dialog.right <= innerWidth && dialog.bottom <= innerHeight; })()'));
      window.setContentSize(1200, 800); await click('[aria-controls=settings-models-panel]');
      await wait('document.querySelector("#settings-models-panel").textContent.includes("4/4")');
      await screenshot('models-chinese'); await click('.workspace-settings-cancel');
      await click('.workspace-topnav nav button', '资料库'); await click('.workspace-library-item', 'sample.webm');
      await switchLanguage('en');
      processingFailure = new Error('媒体没有音轨，请选择包含语音的音频或视频。');
      await click('.workspace-status button');
      await wait('document.querySelector(".workspace-notice")?.textContent.includes("no audio track")');
      await switchLanguage('zh-CN');
      await wait('document.querySelector(".workspace-notice")?.textContent.includes("媒体没有音轨")');
      const { GenerationError } = require(path.join(root, 'build/desktop/src/generation/index.js'));
      processingFailure = new GenerationError('request', 'DeepSeek rejected the request (HTTP 400). Check the generation request.');
      await switchLanguage('en'); await click('.workspace-status button');
      await wait('document.querySelector(".workspace-notice")?.textContent.includes("DeepSeek rejected the request (HTTP 400)")');
      await switchLanguage('zh-CN');
      await wait('document.querySelector(".workspace-notice")?.textContent.includes("DeepSeek 拒绝了请求（HTTP 400）")');
      await screenshot('owned-error-chinese');
      processingFailure = null;
      await fs.writeFile(path.join(output, 'expected-vocabulary.json'), JSON.stringify(ops.listVocabulary()));
      assert.deepEqual(ops.listArtifacts(), [seed.story]);
      assert.deepEqual(ops.get(seed.media.id).segments, seed.media.segments);
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify({ passed: true, locale: await evaluate('document.documentElement.lang'), rendererErrors: errors, dialogs }, null, 2));
  } finally { ops?.close(); window.destroy(); server?.close(); app.quit(); }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
