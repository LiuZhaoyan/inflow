// Native development verification. Dialog selection is supplied deterministically; media decoding and model execution are real.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');

async function run() {
  if (!process.versions.electron) {
    const source = process.argv[2];
    if (!source) throw new Error('Usage: node scripts/verify-desktop.cjs <representative Korean media>');
    const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/desktop-acceptance-'));
    await fs.copyFile(source, path.join(output, '韩语 sample' + path.extname(source)));
    for (const phase of ['first', 'reopen', 'missing']) {
      await new Promise((resolve, reject) => {
        const env = { ...process.env };
        delete env.ELECTRON_RUN_AS_NODE;
        const child = spawn(require('electron'), [__filename, phase, output, path.extname(source)], { stdio: 'inherit', env });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}`)));
      });
      await fs.access(path.join(output, phase + '.json'));
    }
    console.log('Desktop evidence: ' + output);
    return;
  }

  const { app, BrowserWindow, dialog } = require('electron');
  const phase = process.argv[2];
  const output = process.argv[3];
  const source = path.join(output, '韩语 sample' + process.argv[4]);
  app.setPath('userData', path.join(output, 'profile'));
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] });
  const errors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide();
    window.webContents.setBackgroundThrottling(false);
    window.webContents.once('did-finish-load', () => window.hide());
    window.webContents.on('console-message', (_event, details) => { if (details.level === 'error') errors.push(details.message); });
  });
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0];
  assert.ok(window);
  const evaluate = expression => window.webContents.executeJavaScript(expression, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(expression, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return;
      await delay(200);
    }
    throw new Error('Timed out: ' + expression);
  }
  await wait('!!window.inflow && !!document.querySelector(".desktop-import")');
  const click = text => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim().includes(${JSON.stringify(text)}))?.click()`);
  const snapshot = () => evaluate(`({ url: location.href, count: document.querySelectorAll('.segment-list button').length, sentence: document.querySelector('.sentence-meta').textContent, rate: document.querySelector('[aria-label="播放倍速"]').value, loop: document.querySelector('.tools button').getAttribute('aria-pressed'), currentTime: document.querySelector('video')?.currentTime, duration: document.querySelector('video')?.duration, decodedFrames: document.querySelector('video')?.webkitDecodedFrameCount, videoWidth: document.querySelector('video')?.videoWidth, errors: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent), sourceHidden: !document.querySelector('.meaning-group'), translationHidden: !document.querySelector('.translation.expanded') })`);
  let evidence = { phase, electron: process.versions.electron, node: process.versions.node };
  if (phase === 'first') {
    await evaluate('document.querySelector(".desktop-import").click()');
    await wait('document.querySelector("video")?.readyState >= 1');
    await fs.rm(source);
    await evaluate('document.querySelector("video").play()');
    await wait('document.querySelector("video").currentTime > 0.3');
    await evaluate('document.querySelector("video").pause()');
    const started = Date.now();
    await click('开始处理');
    await wait('document.querySelectorAll(".segment-list button").length > 0', 180000);
    evidence.processingMs = Date.now() - started;
    await wait('!document.querySelector(".import-status .process-button").disabled');
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await evaluate(`const select = document.querySelector('[aria-label="播放倍速"]'); select.value = '1.5'; select.dispatchEvent(new Event('change', { bubbles: true }));`);
    await click('循环');
    await evaluate('document.querySelector(".play-button").click()');
    await delay(3200);
    evidence.loopPlayback = await snapshot();
    await fs.writeFile(path.join(output, 'playback-check.json'), JSON.stringify(evidence, null, 2));
    assert.ok(evidence.loopPlayback.currentTime >= 18.78 && evidence.loopPlayback.currentTime <= 20.3);
    await evaluate('document.querySelector("video").pause()');
    await evaluate('document.querySelector(".reveal-trigger").click()');
    await wait('!!document.querySelector("[data-reveal-option=all]")');
    await evaluate('document.querySelector("[data-reveal-option=all]").click()');
    assert.equal((await snapshot()).sourceHidden, false);
    await click('隐藏原文');
    await click('翻译');
    await wait('document.querySelector(".translation.expanded p")?.textContent.includes("4")', 30000);
    evidence.translation = await evaluate('document.querySelector(".translation.expanded p").textContent');
    assert.equal((await snapshot()).sourceHidden, true);
    await evaluate('document.querySelectorAll(".segment-list button")[5].click()');
    assert.equal((await snapshot()).translationHidden, true);
    await click('重新处理');
    await wait('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "取消处理")');
    await delay(1500);
    await click('取消处理');
    await delay(800);
    assert.equal((await snapshot()).count, 33);
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await delay(500);
    const saved = await evaluate('window.inflow.restore()');
    evidence.saved = saved;
    await fs.writeFile(path.join(output, 'expected.json'), JSON.stringify(saved, null, 2));
    await fs.copyFile(path.join(output, 'profile/media', saved.id + process.argv[4]), source);
  } else if (phase === 'reopen') {
    await wait('document.querySelectorAll(".segment-list button").length === 33 && document.querySelector("video")?.readyState >= 1');
    const expected = JSON.parse(await fs.readFile(path.join(output, 'expected.json'), 'utf8'));
    const restored = await evaluate('window.inflow.restore()');
    assert.deepEqual(restored.segments, expected.segments);
    assert.deepEqual(restored.learning, expected.learning);
    assert.equal(restored.id, expected.id);
    const state = await snapshot();
    assert.equal(state.rate, '1.5'); assert.equal(state.loop, 'true');
    assert.ok(Math.abs(state.currentTime - expected.learning.position) < 0.1);
    assert.equal(state.sourceHidden, true); assert.equal(state.translationHidden, true);
    const response = await evaluate(`fetch(document.querySelector('video').src, {headers:{Range:'bytes=0-1023'}}).then(async r => ({status:r.status, bytes:(await r.arrayBuffer()).byteLength}))`);
    evidence.range = response;
    assert.equal(response.status, 206); assert.equal(response.bytes, 1024);
    await evaluate('document.querySelector("video").play()');
    await wait('document.querySelector("video").webkitDecodedFrameCount > 0');
    await evaluate('document.querySelector("video").pause()');
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await wait('document.querySelector("video").readyState >= 2 && !document.querySelector("video").seeking');
    await fs.rm(path.join(output, 'profile/media', restored.id + process.argv[4]));
  } else {
    await wait('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "重新关联媒体")');
    assert.equal((await snapshot()).count, 33);
    await click('重新关联媒体');
    await wait('document.querySelector("video")?.readyState >= 1');
    assert.equal((await snapshot()).count, 33);
    await evaluate(`location.hash = 'library'`);
    assert.equal((await evaluate('window.inflow.list()')).length, 1);
  }
  evidence.ui = await snapshot(); evidence.consoleErrors = errors;
  assert.deepEqual(evidence.ui.errors, []); assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify(evidence, null, 2));
  await fs.writeFile(path.join(output, `${phase}.png`), (await window.webContents.capturePage()).toPNG());
  console.log('Verified desktop phase: ' + phase);
  app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
