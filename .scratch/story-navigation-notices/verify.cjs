/* eslint @typescript-eslint/no-require-imports: off -- Isolated native acceptance through the shipped bridge. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'story-navigation-'));
    for (const phase of ['initial', 'restart', 'before-commit', 'restart-before', 'after-commit', 'restart-after']) {
      const env = { ...process.env, DEEPSEEK_API_KEY: '' }; delete env.ELECTRON_RUN_AS_NODE;
      await new Promise((resolve, reject) => {
        const child = require('node:child_process').spawn(require('electron'), [__filename, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}; evidence: ${output}`)));
      });
      await fs.access(path.join(output, phase + '.json'));
    }
    console.log('PASS: native Story ordering, drafts, generation, notices and crash recovery. Evidence: ' + output);
    return;
  }

  const { app, BrowserWindow, ipcMain, protocol } = require('electron');
  const { DatabaseSync } = require('node:sqlite');
  const output = process.argv[2], phase = process.argv[3];
  const profile = path.join(output, 'profile');
  app.setPath('userData', profile);
  protocol.registerSchemesAsPrivileged([{ scheme:'inflow', privileges:{ standard:true, secure:true, supportFetchAPI:true, stream:true } }]);
  protocol.registerSchemesAsPrivileged = () => {};
  const errors = [], checks = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.once('did-finish-load', () => window.hide());
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  let generationGate = null, generatedCount = 0;
  const generator = async input => {
    if (generationGate) { generationGate.started = true; await generationGate.promise; }
    return { title: 'Generated ' + ++generatedCount, requestedModel: 'fixture', sentences: [
      { parts: [{ text: 'I ', targetId: null }, { text: 'walk', targetId: input.targets[0].id }, { text: ' home.', targetId: null }], translationZh: '我走回家。' },
    ] };
  };
  const processor = async mode => mode === 'models' ? { whisper: true, translate: { 'ko-en': true, 'en-zh': true }, englishParser: true }
    : { surface: 'home', lemma: 'home', language: 'en', candidates: [], meaningZh: '家' };
  let seed;
  if (phase === 'initial') {
    const ops = new DesktopOperations(profile, processor, generator);
    try {
      ops.saveSettings({ interfaceLocale: 'en' });
      const word = ops.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '步行', note: 'Original note' });
      ops.selectVocabulary([word.id]);
      const stories = [];
      for (let i = 0; i < 3; i++) stories.push(await ops.generateArtifact([word.id], '', 'seed-' + i, 'fixture'));
      ops.acceptArtifact(stories[0].id);
      seed = { word, stories };
      await fs.writeFile(path.join(output, 'seed.json'), JSON.stringify(seed));
    } finally { ops.close(); }
  } else seed = JSON.parse(await fs.readFile(path.join(output, 'seed.json'), 'utf8'));
  const [a, b, c] = seed.stories;
  require(path.join(root, 'build/desktop/src/generation/index.js')).generatePassage = generator;
  require(path.join(root, 'build/desktop/src/listening/media-server.js')).runProcessor = processor;
  require(path.join(root, 'build/desktop/src/listening/translation.js')).glossVocabulary = async () => '云端草稿';
  const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
  GenerationCredential.prototype.initialize = async function () {};
  GenerationCredential.prototype.status = () => ({ configured: true });
  GenerationCredential.prototype.get = () => 'fixture';
  const gates = new Map();
  function gate(id) {
    const entry = { started: false, fail: false };
    entry.promise = new Promise(resolve => { entry.release = resolve; });
    gates.set(id, entry); return entry;
  }
  const register = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => register(channel, async (event, ...args) => {
    const pending = channel === 'inflow:openArtifact' ? gates.get(args[0]) : null;
    const result = await handler(event, ...args);
    if (pending) {
      pending.started = true; await pending.promise;
      if (pending.fail) throw new Error('ECONNRESET Bearer fixture-secret sk-1234567890abcdef ' + 'Long safe diagnostic. '.repeat(30));
    }
    return result;
  });
  if (phase === 'after-commit') {
    const accept = DesktopOperations.prototype.acceptArtifact;
    DesktopOperations.prototype.acceptArtifact = function (id) {
      const result = accept.call(this, id);
      if (id === b.id) { require('node:fs').writeFileSync(path.join(output, phase + '.json'), JSON.stringify({ committed: b.id, painted: false })); app.exit(0); }
      return result;
    };
  }
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = async code => {
    try { return await window.webContents.executeJavaScript(code, true); }
    catch (error) { throw new Error(`Renderer evaluation failed: ${code}; console: ${errors.join('\n')}`, { cause:error }); }
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let i = 0; i < 200; i++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error(`Timed out: ${code}; ${await evaluate('JSON.stringify({text:document.body.innerText.slice(-2500), nav:document.querySelector(".workspace-topnav").outerHTML, dialogs:[...document.querySelectorAll("dialog")].map(el=>({class:el.className,open:el.open})), draft:document.querySelector(".vocabulary-selection")?.outerHTML})')}`);
  }
  async function waitGate(entry) {
    for (let i = 0; i < 200 && !entry.started; i++) await delay(25);
    assert.ok(entry.started, 'The renderer requested a real host read');
  }
  const click = (selector, text) => evaluate(`(() => { const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); })()`);
  const field = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  async function library(story) {
    await click('.workspace-topnav button', 'Library');
    await wait('document.querySelector(".workspace-library-dialog")?.open');
    await evaluate(`(() => { const button = [...document.querySelectorAll('.workspace-library-item')].find(el => el.textContent.includes(${JSON.stringify(story.title)})); if (!button) throw Error('Missing story'); button.click(); })()`);
    await wait('!document.querySelector(".workspace-library-dialog").open');
    await delay(100);
  }
  async function history(story) {
    await evaluate('document.querySelector(".story-options summary").click()');
    await evaluate(`document.querySelector('.story-options .inflow-dropdown summary[aria-label="Open saved story"]').click()`);
    await click('.story-options .inflow-dropdown-options button', 'English · ' + story.title);
  }
  async function selected(story) {
    await wait(`document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(story.id)}`);
    assert.equal((await evaluate('window.inflow.restoreArtifact()')).id, story.id);
  }
  async function unchanged(story) { await delay(150); await selected(story); }
  async function collectDraft() {
    await evaluate(`(() => { const p = document.querySelector('#artifact-sentence-0'); p.focus(); const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const start = node.textContent.indexOf('home'); if (start >= 0) { const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + 4); getSelection().removeAllRanges(); getSelection().addRange(range); break; } } })()`);
    await wait('!!document.querySelector(".vocabulary-selection [name=meaningZh]") && !document.querySelector(".vocabulary-selection button[type=submit]").disabled');
  }
  async function discard() { await click('.vocabulary-selection button', 'Discard'); await wait('!document.querySelector(".vocabulary-selection")'); }
  async function reload() {
    await new Promise(resolve => { window.webContents.once('did-finish-load', resolve); window.reload(); });
    await wait('!!document.querySelector(".story-sentences")');
  }
  const database = new DatabaseSync(path.join(profile, 'learning.sqlite'));
  try {
    await wait('!!document.querySelector(".story-sentences")');
    if (phase.startsWith('restart')) {
      const expected = phase === 'restart-after' ? b : a;
      await selected(expected);
      assert.equal((await evaluate('window.inflow.listArtifacts()')).length, 5);
      checks.push('Fresh-process restoration uses the last durable commit');
    } else if (phase === 'before-commit') {
      const pending = gate(b.id); await library(b); await waitGate(pending); await selected(a);
      await fs.writeFile(path.join(output, phase + '.json'), JSON.stringify({ interrupted: b.id, accepted: a.id }));
      app.exit(0); return;
    } else if (phase === 'after-commit') {
      await library(b); await delay(500); assert.fail('Expected process exit during acceptance');
    } else {
      await library(a); await selected(a);
      const slow = gate(b.id); await library(b); await waitGate(slow); await selected(a);
      await history(c); await selected(c); slow.release(); await unchanged(c); gates.clear();
      checks.push('Library → history: stale reply cannot display or persist');
      const first = gate(a.id), second = gate(b.id), third = gate(c.id);
      await library(a); await waitGate(first); await history(b); await waitGate(second); await library(c); await waitGate(third);
      third.release(); await selected(c); second.release(); first.release(); await unchanged(c); gates.clear();
      checks.push('A → B → C: latest intent wins in controlled reverse order');
      const old = gate(a.id), failed = gate(b.id); failed.fail = true;
      await library(a); await waitGate(old); await history(b); await waitGate(failed); failed.release();
      await wait('!!document.querySelector(".app-notice-stack [role=alert]")'); old.release(); await unchanged(c); gates.clear();
      const notice = await evaluate(`(() => { const n = document.querySelector('.app-notice-stack [role=alert]'), m = n.querySelector('.app-notice-message'), s = getComputedStyle(n), r = n.getBoundingClientRect(); return { width:r.width, height:r.height, background:s.backgroundColor, wrap:getComputedStyle(m).whiteSpace, overflow:getComputedStyle(m).textOverflow, clipped:m.scrollWidth > m.clientWidth, safe:n.textContent }; })()`);
      assert.ok(notice.width <= 371); assert.equal(notice.height, 44); assert.equal(notice.background, 'rgb(57, 40, 50)');
      assert.equal(notice.wrap, 'nowrap'); assert.equal(notice.overflow, 'ellipsis'); assert.ok(notice.clipped); assert.doesNotMatch(notice.safe, /fixture-secret|sk-1234567890abcdef/);
      await delay(5200); assert.ok(await evaluate('!!document.querySelector(".app-notice-stack [role=alert]")'));
      window.setPosition(-10000, -10000); window.show(); window.focus(); window.webContents.focus();
      await evaluate('document.querySelector(".app-notice-stack .app-notice-message").focus()');
      window.webContents.sendInputEvent({ type:'keyDown', keyCode:'Enter' }); window.webContents.sendInputEvent({ type:'char', keyCode:'\r' }); window.webContents.sendInputEvent({ type:'keyUp', keyCode:'Enter' });
      await wait('!!document.querySelector(".app-notice-details:popover-open")');
      assert.ok(await evaluate('document.activeElement.matches(".app-notice-details")'));
      assert.match(await evaluate('document.querySelector(".app-notice-details:popover-open p").textContent'), /Long safe diagnostic/);
      window.webContents.sendInputEvent({ type:'keyDown', keyCode:'Escape' }); window.webContents.sendInputEvent({ type:'keyUp', keyCode:'Escape' });
      await wait('!document.querySelector(".app-notice-details:popover-open")');
      window.hide(); window.setPosition(0, 0);
      await evaluate('document.querySelector(".app-notice-stack .app-notice-close").click()');
      checks.push('Newer failure stays persistent, sanitizes details, clips at 370 × 44 and supports keyboard details/dismissal');
      for (const action of ['discard', 'save']) {
        const pending = gate(b.id); await history(b); await waitGate(pending); await collectDraft();
        await delay(50); assert.ok(await evaluate('!!document.querySelector(".vocabulary-selection")'));
        await field('.vocabulary-selection [name=meaningZh]', '草稿' + action);
        await wait('!!document.querySelector(".app-notice-stack [role=status]")');
        assert.equal(await evaluate('document.querySelector(".vocabulary-selection [name=meaningZh]").value'), '草稿' + action);
        if (action === 'discard') await discard();
        else { await evaluate('document.querySelector(".vocabulary-selection button[type=submit]").click()'); await wait('!document.querySelector(".vocabulary-selection")'); }
        pending.release(); await unchanged(c); gates.clear();
      }
      await delay(5200); assert.equal(await evaluate('!!document.querySelector(".app-notice-stack [role=status]")'), false);
      checks.push('Dirty word draft permanently cancels navigation, including immediate save/discard; transient notice expires');
      const cloud = gate(b.id); await history(b); await waitGate(cloud); await collectDraft();
      await click('.vocabulary-selection button', 'Get contextual meaning · LLM');
      await wait('document.querySelector(".vocabulary-selection [name=meaningZh]")?.value === "云端草稿"');
      await discard(); cloud.release(); await unchanged(c); gates.clear();
      checks.push('Cloud-applied meaning permanently cancels navigation even after immediate discard');
      const unedited = gate(b.id); await history(b); await waitGate(unedited); await collectDraft(); unedited.release(); await selected(b); gates.clear();
      assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection")'), false);
      checks.push('Opening an unedited collection editor allows navigation');
      const departure = gate(c.id); await history(c); await waitGate(departure); await click('.workspace-topnav button', 'Vocab'); departure.release(); await unchanged(b); gates.clear();
      assert.ok(await evaluate('document.querySelector(".workspace-vocab").checkVisibility()'));
      checks.push('View departure prevents late focus and persistence');
      const source = gate(c.id);
      await evaluate(`[...document.querySelectorAll('.vocab-context-card')].find(el => el.textContent.includes(${JSON.stringify(c.title)})).querySelector('.vocab-open-source').click()`);
      await waitGate(source); await library(a); await selected(a); source.release(); await unchanged(a); gates.clear();
      checks.push('Vocabulary source → Library obeys the same ordering');
      await click('.workspace-topnav button', 'Vocab');
      const note = gate(b.id);
      await evaluate(`[...document.querySelectorAll('.vocab-context-card')].find(el => el.textContent.includes(${JSON.stringify(b.title)})).querySelector('.vocab-open-source').click()`);
      await waitGate(note);
      await evaluate('document.querySelector(".vocab-notes-section summary").click()');
      await field('.vocab-notes-section textarea', 'Pending source note');
      await wait('document.querySelector(".app-notice-stack")?.textContent.includes("unsaved vocabulary draft")');
      await click('.vocab-notes-section button', 'Save note');
      await wait('document.querySelector(".vocab-notes-section button").disabled');
      note.release(); await unchanged(a); gates.clear();
      assert.equal((await evaluate('window.inflow.listVocabulary()')).find(entry=>entry.id === seed.word.id).note, 'Pending source note');
      checks.push('Notebook note changes cancel a source request permanently even after immediate save');
      await click('.workspace-topnav button', 'Content');
      database.exec("CREATE TRIGGER reject_selection BEFORE UPDATE ON settings WHEN NEW.key = 'artifact' BEGIN SELECT RAISE(ABORT, 'Fixture selection failure'); END");
      await history(b); await wait('document.querySelector(".app-notice-stack")?.textContent.includes("Fixture selection failure")'); await unchanged(a);
      database.exec('DROP TRIGGER reject_selection'); await history(b); await selected(b);
      await reload(); await selected(b); await library(a); await selected(a);
      checks.push('Failed SQLite commit retains selection; explicit retry and reload restore accepted Story');
      async function startGeneration() {
        await click('.workspace-topnav button', 'Vocab'); await click('.vocab-heading-actions button', 'Generate story');
        await wait('document.querySelector(".workspace-target-dialog")?.open'); await click('.workspace-target-dialog button', 'Continue');
        await wait('document.querySelector(".story-generation-dialog")?.open'); await click('.story-generation-dialog button', 'Generate story');
      }
      generationGate = gate('generation'); await startGeneration(); await waitGate(generationGate);
      await evaluate(`document.querySelector('.story-generation-dialog [aria-label="Close generation dialog"]').click()`);
      await wait('!document.querySelector(".story-generation-dialog").open');
      await delay(150);
      await collectDraft();
      await field('.vocabulary-selection [name=meaningZh]', '生成期间的草稿');
      await wait('document.querySelector(".app-notice-stack")?.textContent.includes("unsaved vocabulary draft")');
      const complete = generationGate; generationGate = null; complete.release();
      await wait('!document.querySelector(".story-generation-dialog button:disabled") || !document.querySelector(".story-generation-dialog").open');
      for (let i = 0; i < 100 && (await evaluate('window.inflow.listArtifacts()')).length !== 4; i++) await delay(50);
      const saved = (await evaluate('window.inflow.listArtifacts()'))[0]; assert.equal(saved.targets[0].meaningZh, '步行');
      assert.equal(saved.sentences[0].translationZh, '我走回家。'); await unchanged(a);
      assert.equal(await evaluate('document.querySelector(".vocabulary-selection [name=meaningZh]").value'), '生成期间的草稿');
      await discard();
      checks.push('Successful generation retains snapshots while a dirty collection draft cancels auto-navigation without view departure');
      await startGeneration();
      await wait('!document.querySelector(".story-generation-dialog").open');
      const generated = (await evaluate('window.inflow.listArtifacts()'))[0]; await selected(generated);
      assert.ok(await evaluate('document.querySelector(".workspace-story").checkVisibility()'));
      checks.push('Normal generation automatically accepts and remembers its saved Story');
      await library(a); await selected(a);
      await click('.workspace-topnav button', 'Settings'); await wait('document.querySelector(".workspace-settings-dialog")?.open');
      await click('.workspace-settings-sidebar button', 'LLM');
      await field('#settings-api-key', 'bad\0key');
      // The real credential validator supplies an inline, field-associated failure.
      await click('.workspace-settings-dialog footer button', 'Save');
      await wait('!!document.querySelector("#settings-key-error.app-notice")');
      assert.ok(await evaluate('document.querySelector("#settings-api-key").getAttribute("aria-describedby").includes("settings-key-error")'));
      await click('.workspace-settings-dialog footer button', 'Cancel');
      await evaluate('window.inflow.saveSettings({ interfaceLocale:"zh-CN" })'); await reload();
      await click('.workspace-topnav button', '设置'); await wait('document.querySelector(".workspace-settings-dialog")?.open');
      await evaluate('document.querySelector(".workspace-settings-sidebar [aria-controls=settings-llm-panel]").click()'); await field('#settings-api-key', 'bad\0key');
      await click('.workspace-settings-dialog footer button', '保存'); await wait('!!document.querySelector("#settings-key-error.app-notice")');
      assert.match(await evaluate('document.querySelector("#settings-key-error").textContent'), /密钥|key/);
      window.setSize(480, 800); await delay(200);
      assert.ok(await evaluate('document.querySelector("#settings-key-error").getBoundingClientRect().width <= 370'));
      await click('.workspace-settings-dialog footer button', '取消');
      await evaluate('window.inflow.saveSettings({ interfaceLocale:"en" })');
      checks.push('Settings uses inline associated bilingual notices at normal and narrow widths');
    }
    assert.deepEqual(errors, [], 'No renderer console errors');
    await fs.writeFile(path.join(output, phase + '.json'), JSON.stringify({ phase, checks, errors, electron:process.versions.electron }, null, 2));
    console.log('PASS: ' + phase);
  } finally { database.close(); app.quit(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; if (process.versions.electron) require('electron').app.exit(1); });
