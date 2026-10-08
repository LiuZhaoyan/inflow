/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'settings-native-'));
    require('node:child_process').execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=10', '-t', '12', '-c:v', 'libvpx', '-an', path.join(output, 'sample.webm')], { windowsHide: true });
    for (const phase of ['initial', 'restart']) {
      const env = { ...process.env, DEEPSEEK_API_KEY: '' };
      delete env.ELECTRON_RUN_AS_NODE;
      await new Promise((resolve, reject) => {
        const child = require('node:child_process').spawn(require('electron'), [__filename, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Settings ${phase} acceptance exited ${code}`)));
      });
    }
    console.log(`PASS: native Settings acceptance and real profile restart.\nEvidence: ${output}`);
    return;
  }

  const { app, BrowserWindow, protocol, ipcMain, safeStorage } = require('electron');
  const output = process.argv[2], phase = process.argv[3], profile = path.join(output, 'profile');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  require('node:fs').mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const errors = [];
  let keyCalls = 0, colorCalls = 0, providerCalls = 0, failKey = false, failColor = false, blockColor = false, releaseColor;
  const register = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => register(channel, (event, ...args) => {
    if (channel === 'inflow:configureCredential') {
      keyCalls++;
      if (failKey) throw new Error('Fixture key save failure.');
    }
    if (channel === 'inflow:saveSettings') {
      colorCalls++;
      if (failColor) throw new Error('Fixture color save failure.');
      if (blockColor) return new Promise(resolve => { releaseColor = () => resolve(handler(event, ...args)); });
    }
    return handler(event, ...args);
  });
  global.fetch = async () => { providerCalls++; throw new Error('Settings acceptance must not contact a cloud provider.'); };
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  // Ignore any developer .env files when starting the real application host.
  const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
  const initialize = GenerationCredential.prototype.initialize;
  GenerationCredential.prototype.initialize = function () { return initialize.call(this, profile); };
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true).catch(error => { throw new Error(`${error.message}\nEvaluation: ${code}\nRenderer errors: ${errors.join('\n')}`); });
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let count = 0; count < 200; count++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error(`Timed out: ${code}`);
  }
  async function click(selector, text = '') {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.includes(${JSON.stringify(text)})); if (!el || el.disabled) return false; el.focus(); el.click(); return true; })()`), selector);
    await delay(50);
  }
  async function input(selector, value) {
    assert.ok(await evaluate(`document.querySelector(${JSON.stringify(selector)}).checkVisibility()`), `${selector} must be visible before editing`);
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await delay(50);
  }
  async function escape() {
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await delay(50);
  }
  async function category(name) { await click('.workspace-settings-sidebar button', name); }
  async function settings(name = 'LLM') {
    await click('.workspace-settings-nav button'); await wait('!!document.querySelector(".workspace-settings-dialog[open]")');
    if (name !== 'LLM') await category(name);
  }
  const maskColor = () => evaluate('document.querySelector(".workspace-video-stage .workspace-video-mask")?.style.backgroundColor');
  const savedColor = () => evaluate('window.inflow.getSettings().then(settings => settings.videoMaskColor)');
  const screenshot = async name => {
    await delay(250);
    try {
      const { data } = await window.webContents.debugger.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(output, name), Buffer.from(data, 'base64'));
    }
    catch (error) { throw new Error(`Screenshot ${name}: ${error.message}`); }
  };
  window.setContentSize(1440, 900);
  window.webContents.debugger.attach('1.3');
  await wait('!!document.querySelector(".workspace-topnav") && !!document.querySelector("#notebook")');

  if (phase === 'restart') {
    await wait('!!document.querySelector(".workspace-video-stage .workspace-video-mask")');
    assert.equal(await maskColor(), 'rgb(34, 68, 102)');
    assert.equal(await savedColor(), '#224466');
    await settings();
    assert.equal(await evaluate('document.querySelector("#settings-api-key").value'), '');
    assert.ok(await evaluate('document.querySelector(".workspace-settings-section-heading").textContent.includes("Configured")'));
    assert.equal(await evaluate('document.querySelector("#settings-mask-color").value'), '#224466');
    assert.equal(providerCalls, 0); assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'restart-result.json'), JSON.stringify({ passed: true, providerCalls, errors }, null, 2));
    app.quit(); return;
  }

  await settings('Subtitle mask');
  assert.equal(await evaluate('document.querySelector("#settings-mask-color").value'), '#000000');
  assert.ok(await evaluate('document.querySelector(".workspace-settings-picture").checkVisibility()'));
  await screenshot('settings-empty-library.png');
  await input('#settings-mask-color', '#bca4f8');
  assert.equal(await evaluate('document.querySelector(".workspace-settings-picture .workspace-video-mask").style.backgroundColor'), 'rgb(188, 164, 248)');
  await click('.workspace-settings-cancel');
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(await savedColor(), '#000000');
  assert.equal(keyCalls, 0); assert.equal(colorCalls, 0);
  assert.ok(await evaluate('document.activeElement.matches(".workspace-settings-nav button")'));
  await settings('Subtitle mask'); await input('#settings-mask-color', '#334455'); await click('.workspace-settings-dialog button[type=submit]');
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(keyCalls, 0); assert.equal(await savedColor(), '#334455');

  const ops = new DesktopOperations(profile, async mode => mode === 'probe' ? { duration: 12 } : { segments: [{ start: 0, end: 12, text: 'Hello friend.', groups: ['Hello', ' friend.'] }] });
  const first = await ops.transcribe((await ops.importMedia(path.join(output, 'sample.webm'), 'en')).id, 'seed-first');
  await fs.copyFile(path.join(output, 'sample.webm'), path.join(output, 'other.webm'));
  const second = await ops.importMedia(path.join(output, 'other.webm'), 'en');
  const region = { enabled: true, x: 0.1, y: 0.7, width: 0.8, height: 0.2 };
  const masks = { [first.segments[0].id]: [0] };
  ops.saveLearning(first.id, { ...first.learning, position: 2, rate: 1.25, loop: true, masks, videoMask: region });
  ops.saveLearning(second.id, { ...second.learning, videoMask: { ...region, enabled: false } });
  const word = ops.saveVocabulary({ language: 'en', lemma: 'friend', meaningZh: '朋友' });
  ops.selectVocabulary([word.id]); ops.open(first.id);
  window.reload();
  await wait('!!document.querySelector(".workspace-video-stage .workspace-video-mask") && !!document.querySelector(".vocab-row")');
  await click('.workspace-topnav button', 'Vocab'); await click('.vocab-generate');
  await wait('!!document.querySelector(".workspace-target-dialog[open]")');
  await click('.workspace-target-dialog button[type=submit]');
  await wait('!!document.querySelector(".story-generation-dialog[open]")');
  assert.ok(await evaluate('document.querySelector(".story-generation-dialog footer button:last-child").disabled'));
  await input('.story-topic input', 'Preserve this topic');
  await click('.story-credential button'); await wait('!!document.querySelector(".workspace-settings-dialog[open]")');
  await input('#settings-api-key', 'settings-acceptance-key'); await click('.workspace-settings-dialog button[type=submit]');
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(await evaluate('document.querySelector(".story-generation-dialog footer button:last-child").disabled'), false);
  assert.equal(await evaluate('document.querySelector(".story-topic input").value'), 'Preserve this topic');
  assert.equal(await evaluate('document.querySelectorAll(".story-selected-targets li").length'), 1);
  assert.ok(await evaluate('document.activeElement.matches(".story-credential button")'));
  const encrypted = await fs.readFile(path.join(profile, 'deepseek.key'));
  assert.equal(encrypted.includes(Buffer.from('settings-acceptance-key')), false);
  assert.equal(safeStorage.decryptString(encrypted), 'settings-acceptance-key');
  await click('.story-generation-dialog footer button', 'Cancel');
  await click('.workspace-topnav button', 'Library'); await click('.workspace-library-item', 'sample.webm');
  await wait('!!document.querySelector("video") && document.querySelector("video").readyState >= 2');
  await evaluate('document.querySelector("video").play()');
  await wait('!document.querySelector("video").paused');
  const position = await evaluate('document.querySelector("video").currentTime');
  await settings();
  assert.equal(await evaluate('document.querySelector("video").paused'), true);
  assert.ok(Math.abs(await evaluate('document.querySelector("video").currentTime') - position) < 0.3);
  await input('#settings-api-key', 'settings-replacement-key');
  await category('Subtitle mask');
  assert.equal(await evaluate('document.querySelector("#settings-llm-panel").checkVisibility()'), false);
  await input('#settings-mask-color', '#bca4f8');
  assert.equal(await maskColor(), 'rgb(51, 68, 85)');
  await category('LLM');
  assert.equal(await evaluate('document.querySelector("#settings-api-key").value'), 'settings-replacement-key');
  await category('Subtitle mask');
  assert.equal(await evaluate('document.querySelector("#settings-mask-color").value'), '#bca4f8');
  failColor = true;
  await click('.workspace-settings-dialog button[type=submit]');
  await wait('!!document.querySelector(".workspace-settings-error")');
  assert.ok(await evaluate('document.querySelector("#settings-subtitles-panel").checkVisibility()'));
  assert.ok(await evaluate('document.querySelector(".workspace-settings-sidebar button").textContent.includes("Saved")'));
  assert.equal(await evaluate('document.querySelector("#settings-api-key").value'), '');
  assert.ok(await evaluate('document.querySelector("#settings-llm-panel .workspace-settings-result").textContent.includes("API key saved")'));
  assert.equal(await savedColor(), '#334455'); assert.equal(keyCalls, 2);
  failColor = false; blockColor = true;
  await click('.workspace-settings-dialog button[type=submit]');
  assert.ok(await evaluate('document.querySelector(".workspace-settings-dialog button[type=submit]").disabled'));
  assert.ok(await evaluate(`document.querySelector('button[aria-label="Close settings"]').disabled`));
  await escape(); assert.ok(await evaluate('!!document.querySelector(".workspace-settings-dialog[open]")'));
  blockColor = false; releaseColor();
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(keyCalls, 2); assert.equal(await savedColor(), '#bca4f8');
  assert.equal(await maskColor(), 'rgb(188, 164, 248)');
  assert.equal(await evaluate('document.querySelector("video").paused'), true);

  await settings(); await input('#settings-api-key', 'unsaved-replacement'); await category('Subtitle mask'); await input('#settings-mask-color', '#117744');
  failKey = true; await click('.workspace-settings-dialog button[type=submit]');
  await wait('!!document.querySelector(".workspace-settings-error")');
  assert.ok(await evaluate('document.querySelector("#settings-llm-panel").checkVisibility()'));
  assert.ok(await evaluate('document.querySelector(".workspace-settings-sidebar button:last-child").textContent.includes("Saved")'));
  assert.equal(await savedColor(), '#117744'); assert.equal(await maskColor(), 'rgb(17, 119, 68)');
  assert.equal(await evaluate('document.querySelector("#settings-api-key").value'), 'unsaved-replacement');
  assert.ok(await evaluate('document.querySelector("#settings-subtitles-panel .workspace-settings-result").textContent.includes("Mask color saved")'));
  await screenshot('settings-partial-save.png');
  await click('.workspace-settings-cancel'); failKey = false;
  assert.equal(safeStorage.decryptString(await fs.readFile(path.join(profile, 'deepseek.key'))), 'settings-replacement-key');
  await settings('Subtitle mask'); await input('#settings-mask-color', '#abcdef'); await escape();
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(await savedColor(), '#117744');
  await settings('Subtitle mask'); await input('#settings-mask-color', '#224466'); await click('.workspace-settings-dialog button[type=submit]');
  await wait('!document.querySelector(".workspace-settings-dialog")');
  assert.equal(keyCalls, 3); assert.equal(await savedColor(), '#224466');

  await settings(); await screenshot('settings-llm.png');
  assert.ok(await evaluate(`(() => { const sidebar = document.querySelector('.workspace-settings-sidebar').getBoundingClientRect(), content = document.querySelector('.workspace-settings-content').getBoundingClientRect(); return sidebar.right <= content.left && Math.abs(sidebar.top - content.top) < 1; })()`));
  // Navigate both categories with the native keyboard controls.
  await evaluate('document.querySelector(".workspace-settings-sidebar button").focus()');
  await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.ok(await evaluate('document.activeElement.matches(".workspace-settings-sidebar button:last-child")'));
  await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
  await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait('document.querySelector("#settings-subtitles-panel").checkVisibility()');
  assert.equal(await evaluate('document.querySelector(".workspace-settings-sidebar button:last-child").getAttribute("aria-current")'), 'page');
  await screenshot('settings-desktop.png');
  assert.ok(await evaluate(`(() => { const dialog = document.querySelector('.workspace-settings-dialog').getBoundingClientRect(), footer = document.querySelector('.workspace-settings-dialog footer').getBoundingClientRect(); return footer.top >= dialog.top && footer.bottom <= dialog.bottom; })()`));
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".workspace-settings-dialog")).fontFamily'), await evaluate('getComputedStyle(document.querySelector(".workspace-shell")).fontFamily'));
  window.setContentSize(390, 760); await delay(150);
  const narrow = await evaluate(`(() => { const el = document.querySelector('.workspace-settings-dialog'), rect = el.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, viewport: innerWidth }; })()`);
  await screenshot('settings-narrow.png');
  assert.ok(narrow.left >= 16 && narrow.right <= narrow.viewport - 16, JSON.stringify(narrow));
  assert.equal(narrow.scrollWidth, narrow.clientWidth);
  const narrowContent = await evaluate(`(() => { const sidebar = document.querySelector('.workspace-settings-sidebar').getBoundingClientRect(), content = document.querySelector('.workspace-settings-content'); return { sidebarBottom: sidebar.bottom, contentTop: content.getBoundingClientRect().top, scrollWidth: content.scrollWidth, clientWidth: content.clientWidth }; })()`);
  assert.ok(narrowContent.sidebarBottom <= narrowContent.contentTop + 1 && narrowContent.scrollWidth <= narrowContent.clientWidth, JSON.stringify(narrowContent));
  assert.ok(await evaluate(`(() => { const dialog = document.querySelector('.workspace-settings-dialog').getBoundingClientRect(), footer = document.querySelector('.workspace-settings-dialog footer').getBoundingClientRect(); return footer.top >= dialog.top && footer.bottom <= dialog.bottom; })()`));
  await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".workspace-settings-dialog button")).transitionDuration'), '0s');
  await escape();
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await click('.workspace-topnav button', 'Library');
  assert.ok(await evaluate('Math.abs(document.querySelector(".workspace-library-dialog").getBoundingClientRect().top - document.querySelector(".workspace-topnav").getBoundingClientRect().bottom) < 1'));
  await click('button[aria-label="Close library"]');
  window.setContentSize(900, 520); await delay(150); await settings('Subtitle mask');
  const shortContent = await evaluate(`(() => { const content = document.querySelector('.workspace-settings-content'), footer = document.querySelector('.workspace-settings-dialog footer').getBoundingClientRect(); content.scrollTop = content.scrollHeight; return { scrollHeight: content.scrollHeight, clientHeight: content.clientHeight, contentBottom: content.getBoundingClientRect().bottom, footerTop: footer.top, footerBottom: footer.bottom, viewport: innerHeight }; })()`);
  assert.ok(shortContent.scrollHeight > shortContent.clientHeight && shortContent.contentBottom <= shortContent.footerTop + 1 && shortContent.footerBottom < shortContent.viewport, JSON.stringify(shortContent));
  await screenshot('settings-short-window.png'); await escape();
  window.setContentSize(1440, 900);
  const retained = ops.get(first.id).learning;
  assert.deepEqual(retained.videoMask, region); assert.deepEqual(retained.masks, masks);
  assert.equal(retained.rate, 1.25); assert.equal(retained.loop, true);
  assert.equal(ops.get(second.id).learning.videoMask.enabled, false);
  assert.equal(providerCalls, 0); assert.deepEqual(errors, []);
  ops.close();
  await fs.writeFile(path.join(output, 'initial-result.json'), JSON.stringify({ passed: true, keyCalls, colorCalls, providerCalls, narrow, errors }, null, 2));
  app.quit();
}

run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
