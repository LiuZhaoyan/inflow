/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const artifactMode = process.argv.includes('--artifacts');

async function run() {
  if (!process.versions.electron) {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve, reject) => {
      const child = require('node:child_process').spawn(require('electron'), [__filename, ...process.argv.slice(2)], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Library acceptance exited ${code}`)));
    });
    return;
  }
  const { app, BrowserWindow, protocol, ipcMain } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/library-native-'));
  const profile = path.join(output, 'profile');
  app.setPath('userData', profile);
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const lookupInputs = [];
  const ops = new DesktopOperations(profile, async (mode, ...args) => mode === 'probe' ? { duration: 2 } : mode === 'lookup' ? {
    ...args[2], lemma: args[2].surface,
  } : {
    segments: [{ start: 0, end: 2, text: 'Library fixture.', groups: ['Library fixture.'] }],
  }, async input => ({ title: input.topic || `${input.language === 'en' ? 'English' : 'Korean'} story`, requestedModel: 'fixture',
    sentences: [{ parts: [{ text: input.targets[0].lemma, targetId: input.targets[0].id }], translationZh: '朋友' }],
  }));
  const wav = Buffer.alloc(44 + 64000);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(64000, 40);
  for (const language of ['ko', 'en']) {
    const sample = path.join(output, `${language === 'en' ? 'English' : 'Korean'} audio.wav`);
    await fs.writeFile(sample, wav);
    await ops.transcribe((await ops.importMedia(sample, language)).id, `seed-${language}`);
    const word = ops.saveVocabulary({ language, lemma: language === 'en' ? 'friend' : '친구', meaningZh: '朋友' });
    await ops.generateArtifact([word.id], '', `story-${language}`, 'fixture');
  }
  if (!artifactMode) ops.close();
  let holdOpen = false, failGeneration = false;
  const pendingOpen = [];
  if (artifactMode) {
    const handle = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = (channel, handler) => handle(channel, (event, ...args) => {
      if (channel === 'inflow:credentialStatus') return { configured: true };
      if (channel === 'inflow:lookupVocabulary') { lookupInputs.push(args[0]); return ops.lookupVocabulary(...args); }
      if (channel === 'inflow:generateArtifact') {
        if (failGeneration) throw new Error('Fixture generation failure');
        return ops.generateArtifact(...args, 'fixture');
      }
      if (channel === 'inflow:openArtifact' && holdOpen) return new Promise(resolve => pendingOpen.push(() => resolve(handler(event, ...args))));
      return handler(event, ...args);
    });
    const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
    GenerationCredential.prototype.initialize = async function () {};
  }
  const errors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  global.fetch = async () => { throw new Error('This UI check must not contact a model provider.'); };
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let count = 0; count < 100; count++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error(`Timed out: ${code}`);
  }
  async function click(selector, text) {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && (!${JSON.stringify(text || '')} || el.textContent.startsWith(${JSON.stringify(text || '')}))); if (!el) return false; el.click(); return true; })()`), selector);
    await delay(50);
  }
  function escape() { window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' }); }
  const geometry = () => evaluate(`(() => { const el=document.querySelector('.workspace-library-dialog'), rect=el.getBoundingClientRect(); return {left:rect.left,top:rect.top,bottom:rect.bottom,width:rect.width,header:document.querySelector('.workspace-topnav').getBoundingClientRect().bottom,viewport:innerHeight,radius:getComputedStyle(el).borderRadius}; })()`);
  await wait('!!window.inflow && !!document.querySelector(".workspace-topnav")');
  await wait('document.querySelectorAll(".workspace-library-entry").length === 4');
  if (artifactMode) {
    const stories = ops.listArtifacts(), english = stories.find(item => item.language === 'en'), korean = stories.find(item => item.language === 'ko');
    async function consistent(artifact) {
      await wait(`document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(artifact.id)}`);
      assert.equal(await evaluate('document.querySelector(".workspace-library-item[aria-current=true] strong")?.textContent'), artifact.title);
    }
    async function chooseStory(artifact) {
      await evaluate(`(() => { const el=document.querySelector('select[aria-label="Open saved story"]'); el.value=${JSON.stringify(artifact.id)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    }
    async function collect(artifact, meaning) {
      await evaluate(`(() => { document.activeElement?.blur(); const range=document.createRange(); range.selectNodeContents(document.querySelector('.artifact-korean')); getSelection().removeAllRanges(); getSelection().addRange(range); })()`);
      await wait('!!document.querySelector(".vocabulary-selection input[name=meaningZh]")');
      await wait('!document.querySelector(".vocabulary-selection [role=status]")?.textContent.includes("Finding dictionary")');
      assert.equal(lookupInputs.at(-1).source.artifactId, artifact.id);
      assert.equal(lookupInputs.at(-1).language, artifact.language);
      await evaluate(`(() => { const el=document.querySelector('.vocabulary-selection input[name=meaningZh]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(meaning)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await delay(50);
    }
    await wait(`document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(english.id)}`);
    await click('.workspace-topnav button', 'Library'); await click('.workspace-library-item', 'STORYEnglish story');
    await consistent(english);
    await chooseStory(korean); await consistent(korean);
    await collect(korean, 'Draft to retain');
    await chooseStory(english);
    await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
    await consistent(korean);
    await click('.vocabulary-selection button', 'Discard');
    holdOpen = true;
    await chooseStory(english);
    for (let count = 0; !pendingOpen.length && count < 100; count++) await delay(50);
    assert.equal(pendingOpen.length, 1);
    await collect(korean, 'Shared Korean context');
    pendingOpen.shift()();
    await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
    await consistent(korean);
    await click('.vocabulary-selection button[type=submit]'); await wait('!document.querySelector(".vocabulary-selection")');
    assert.equal(ops.listVocabulary().find(entry => entry.meaningZh === 'Shared Korean context').contexts[0].source.artifactId, korean.id);
    holdOpen = false;
    await click('.workspace-topnav button', 'Library'); await click('.workspace-library-item', 'STORYEnglish story');
    await consistent(english);
    await click('.story-options summary'); await click('.story-options button', 'Generate a story');
    await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    await evaluate(`(() => { const label=[...document.querySelectorAll('.workspace-target-list label')].find(el=>el.querySelector('strong').textContent==='friend'); label.querySelector('input').click(); })()`);
    await click('.workspace-target-dialog button[type=submit]'); await wait('!!document.querySelector(".story-generation-dialog[open]")');
    await evaluate(`(() => { const el=document.querySelector('.story-generation-dialog input[name=topic]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Generated story'); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    failGeneration = true;
    await click('.story-generation-dialog footer button', 'Generate story');
    await wait('document.querySelector(".story-generation-dialog [role=alert]")?.textContent.includes("Fixture generation failure")');
    await consistent(english); assert.equal(ops.listArtifacts().length, 2);
    failGeneration = false;
    await click('.story-generation-dialog footer button', 'Retry generation');
    await wait('!document.querySelector(".story-generation-dialog[open]")');
    const generated = ops.listArtifacts()[0]; await consistent(generated);
    assert.equal(generated.title, 'Generated story');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-library-entry").length'), 5);
    await collect(generated, 'Shared generated context');
    await click('.vocabulary-selection button[type=submit]'); await wait('!document.querySelector(".vocabulary-selection")');
    assert.equal(ops.listVocabulary().find(entry => entry.meaningZh === 'Shared generated context').contexts[0].source.artifactId, generated.id);
    window.webContents.reload();
    await wait(`document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(generated.id)}`);
    await click('.workspace-topnav button', 'Library'); await click('.workspace-library-item', 'STORYGenerated story');
    await consistent(generated);
    assert.equal(ops.restoreArtifact().id, generated.id);
    assert.equal(errors.length, 0, errors.join('\n'));
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, artifact: generated.id, lookupInputs, errors }, null, 2));
    console.log(`PASS: shared Story restoration, history/Library navigation, draft protection, generation failure/retry and vocabulary provenance.\nEvidence: ${output}`);
    ops.close(); app.quit(); return;
  }
  window.setContentSize(1440, 900); window.show(); window.focus(); window.webContents.focus();
  await click('.workspace-topnav button', 'Library'); await delay(250);
  const wide = await geometry();
  assert.equal(wide.left, 0); assert.equal(wide.top, wide.header); assert.equal(wide.bottom, wide.viewport); assert.equal(wide.radius, '0px');
  assert.equal(await evaluate('document.querySelector(".workspace-library-filter-menu").checkVisibility()'), false);
  await fs.writeFile(path.join(output, 'library-collapsed.png'), (await window.webContents.capturePage()).toPNG());
  await evaluate('document.querySelector(".workspace-library-filter > summary").focus()');
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); window.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
  await wait('document.querySelector(".workspace-library-filter").open');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert.equal(await evaluate(`(() => { const menu=document.querySelector('.workspace-library-filter-menu'), rect=menu.getBoundingClientRect(); return rect.left >= 0 && rect.right <= 360 && menu.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)); })()`), true);
  await delay(100);
  await fs.writeFile(path.join(output, 'library-filter.png'), (await window.webContents.capturePage()).toPNG());
  await click('.workspace-library-filters button', 'English');
  assert.equal(await evaluate('document.querySelectorAll(".workspace-library-entry").length'), 2);
  assert.equal(await evaluate('document.querySelector(".workspace-library-filter").open'), false);
  assert.equal(await evaluate('document.activeElement.matches(".workspace-library-filter > summary")'), true);
  assert.equal(await evaluate('[...document.querySelectorAll(".workspace-library-entry .workspace-language-badge")].every(el => el.textContent === "English")'), true);
  await evaluate(`(() => { const el=document.querySelector('.workspace-library-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'story'); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await wait('document.querySelectorAll(".workspace-library-entry").length === 1');
  await evaluate(`(() => { const el=document.querySelector('.workspace-library-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,''); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click('.workspace-library-filter > summary'); await click('.workspace-library-filters button', 'Korean');
  assert.equal(await evaluate('document.querySelectorAll(".workspace-library-entry").length'), 2);
  assert.equal(await evaluate('[...document.querySelectorAll(".workspace-library-entry .workspace-language-badge")].every(el => el.textContent === "Korean")'), true);
  await click('.workspace-library-filter > summary'); await click('.workspace-library-filters button', 'All');
  assert.equal(await evaluate('document.querySelectorAll(".workspace-library-entry").length'), 4);
  await click('.workspace-library-filter > summary'); escape();
  await wait('!document.querySelector(".workspace-library-filter").open');
  assert.equal(await evaluate('document.querySelector(".workspace-library-dialog").open'), true);
  escape(); await wait('document.querySelector(".workspace-topnav button[aria-haspopup=dialog]").getAttribute("aria-expanded") === "false"');
  await click('.workspace-topnav button', 'Library'); await click('.workspace-library-filter > summary');
  await click('button[aria-label="Close library"]'); await wait('document.querySelector(".workspace-topnav button[aria-haspopup=dialog]").getAttribute("aria-expanded") === "false"');
  await click('.workspace-topnav button', 'Library');
  assert.equal(await evaluate('document.querySelector(".workspace-library-filter").open'), false);
  window.setContentSize(390, 760); await delay(250);
  const narrow = await geometry();
  assert.equal(narrow.left, 0); assert.equal(narrow.top, narrow.header); assert.equal(narrow.bottom, narrow.viewport); assert.ok(narrow.width <= 390);
  await fs.writeFile(path.join(output, 'library-narrow.png'), (await window.webContents.capturePage()).toPNG());
  window.webContents.debugger.attach('1.3');
  await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".workspace-library-dialog")).animationName'), 'none');
  await click('button[aria-label="Close library"]');
  await wait('document.querySelector(".workspace-topnav button[aria-haspopup=dialog]").getAttribute("aria-expanded") === "false"');
  window.setContentSize(1440, 900);
  await click('.workspace-topnav button', 'Vocab'); await wait('document.querySelectorAll(".vocab-row").length === 2');
  assert.equal(await evaluate('document.querySelector(".vocab-language-filter-menu").checkVisibility()'), false);
  await delay(100); await fs.writeFile(path.join(output, 'vocab-collapsed.png'), (await window.webContents.capturePage()).toPNG());
  await click('.vocab-language-filter > summary');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert.equal(await evaluate(`(() => { const menu=document.querySelector('.vocab-language-filter-menu'), rect=menu.getBoundingClientRect(), panel=document.querySelector('.vocab-list-panel').getBoundingClientRect(); return rect.left >= panel.left && rect.right <= panel.right && menu.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)); })()`), true);
  await delay(100); await fs.writeFile(path.join(output, 'vocab-filter.png'), (await window.webContents.capturePage()).toPNG());
  await click('.vocab-language-filters button', 'English');
  assert.equal(await evaluate('document.querySelector(".vocab-language-filter").open'), false);
  assert.equal(await evaluate('document.activeElement.matches(".vocab-language-filter > summary")'), true);
  assert.equal(await evaluate('document.querySelector(".vocab-detail-title h2").textContent'), 'friend');
  await click('.vocab-filters button', 'No source');
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 1);
  await click('.vocab-filters button', 'Stories');
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 0);
  await click('.vocab-filters button', 'All');
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 1);
  await click('.vocab-language-filter > summary'); await click('.vocab-language-filters button', 'Korean');
  assert.equal(await evaluate('document.querySelector(".vocab-detail-title h2").textContent'), '친구');
  await click('.vocab-language-filter > summary'); escape(); await wait('!document.querySelector(".vocab-language-filter").open');
  window.setContentSize(1100, 800); await delay(100);
  await click('.vocab-language-filter > summary');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  assert.equal(await evaluate(`(() => { const rect=document.querySelector('.vocab-language-filter-menu').getBoundingClientRect(), panel=document.querySelector('.vocab-list-panel').getBoundingClientRect(); return rect.left >= panel.left && rect.right <= panel.right; })()`), true);
  await delay(100); await fs.writeFile(path.join(output, 'vocab-filter-1100.png'), (await window.webContents.capturePage()).toPNG());
  await click('.vocab-language-filters button', 'All');
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 2);
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, wide, narrow, errors }, null, 2));
  console.log(`PASS: flush drawer, Library/Vocab language menus, combined source filters, search, keyboard, close/reopen and reduced motion.\nEvidence: ${output}`);
  app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
