/* eslint @typescript-eslint/no-require-imports: off -- Native Electron acceptance through the shipped bridge. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'vocabulary-state-'));
    require('node:child_process').execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', path.join(output, 'sample.wav')], { windowsHide: true });
    const env = { ...process.env, DEEPSEEK_API_KEY: '' }; delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve, reject) => {
      const child = require('node:child_process').spawn(require('electron'), [__filename, output], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Vocabulary state acceptance exited ${code}; evidence: ${output}`)));
    });
    console.log('PASS: native vocabulary ownership acceptance. Evidence: ' + output);
    return;
  }

  const { app, BrowserWindow, ipcMain, protocol } = require('electron');
  const output = process.argv[2], profile = path.join(output, 'profile');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  protocol.registerSchemesAsPrivileged = () => {};
  await fs.mkdir(profile, { recursive: true }); app.setPath('userData', profile);
  app.on('browser-window-created', (_event, window) => { window.hide(); window.webContents.setBackgroundThrottling(false); });
  await app.whenReady();
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  let generationGate, generated = 0;
  const generator = async input => {
    if (generationGate) await generationGate;
    return { title: 'Ownership story ' + ++generated, requestedModel: 'fixture', sentences: [{
      parts: [...input.targets.map(target => ({ text: target.lemma + ' ', targetId: target.id })), { text: '있어요.', targetId: null }], translationZh: '这里有。',
    }] };
  };
  const processor = async mode => mode === 'probe' ? { duration: 3 } : mode === 'lookup'
    ? { surface: '있어요', lemma: '있다', language: 'ko', candidates: [] }
    : { segments: [{ start: 0, end: 3, text: '배가 있어요.', groups: ['배가', ' 있어요.'] }] };
  const ops = new DesktopOperations(profile, processor, generator);
  ops.saveSettings({ interfaceLocale: 'en' });
  const media = await ops.transcribe((await ops.importMedia(path.join(output, 'sample.wav'))).id, 'seed');
  const otherMedia = await ops.transcribe((await ops.importMedia(path.join(output, 'sample.wav'))).id, 'seed-other');
  const source = saved => ({ surface: '배', surfaceStart: 0, sentence: saved.segments[0].text, source: { type: 'media', mediaId: saved.id, segmentId: saved.segments[0].id, name: saved.name, start: 0 } });
  const boat = ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '船', context: source(media) });
  ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '船', context: source(otherMedia) });
  const apple = ops.saveVocabulary({ language: 'ko', lemma: '사과', meaningZh: '苹果' });
  const seedStory = await ops.generateArtifact([boat.id], '', 'seed-story', 'fixture-key');
  ops.acceptArtifact(seedStory.id);
  let failRead = true, failSave = false, failDelete = false, blockRead = false, releaseRead, reads = 0, releaseGeneration;
  const register = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => register(channel, (event, ...args) => {
    if (channel === 'inflow:listVocabulary') {
      reads++;
      if (failRead) throw new Error('Fixture refresh failure.');
      const snapshot = ops.listVocabulary();
      if (blockRead) { blockRead = false; return new Promise(resolve => { releaseRead = () => { releaseRead = null; resolve(snapshot); }; }); }
      return snapshot;
    }
    if (channel === 'inflow:saveVocabulary' && failSave) throw new Error('Fixture save failure.');
    if (channel === 'inflow:deleteVocabulary' && failDelete) throw new Error('Fixture delete failure.');
    const fixtures = {
      saveVocabulary: input => ops.saveVocabulary(input), deleteVocabulary: id => ops.deleteVocabulary(id),
      selectVocabulary: ids => ops.selectVocabulary(ids), listArtifactVocabulary: id => ops.listArtifactVocabulary(id),
      lookupVocabulary: (input, job) => ops.lookupVocabulary(input, job), transcribe: (id, job) => ops.transcribe(id, job),
      generateArtifact: (ids, topic, job) => ops.generateArtifact(ids, topic, job, 'fixture-key'),
      credentialStatus: () => ({ configured: true }),
    };
    const fixture = fixtures[channel.replace('inflow:', '')];
    return fixture ? fixture(...args) : handler(event, ...args);
  });
  global.fetch = async () => { throw new Error('Acceptance must not contact a provider.'); };
  const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
  const initialize = GenerationCredential.prototype.initialize;
  GenerationCredential.prototype.initialize = function () { return initialize.call(this, profile); };
  require(path.join(root, 'build/desktop/desktop/main.js'));
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  window.setContentSize(1440, 900);
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let count = 0; count < 200; count++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error('Timed out: ' + code);
  }
  async function waitHost(predicate) {
    for (let count = 0; count < 200; count++) { if (predicate()) return; await delay(50); }
    throw new Error('Timed out waiting for fixture.');
  }
  async function click(selector, text = '') {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.includes(${JSON.stringify(text)})); if (!el || el.disabled) return false; el.click(); return true; })()`), selector + ': ' + text);
    await delay(60);
  }
  async function field(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await delay(60);
  }
  const nav = name => click('.workspace-topnav button', name);
  const selectBoat = () => click('.vocab-row', '船');
  async function noteDraft(value) {
    if (!await evaluate('document.querySelector(".vocab-notes-section").open')) await click('.vocab-notes-section summary');
    await field('.vocab-notes-section textarea', value);
  }
  async function saveNote(value) {
    await noteDraft(value); await click('.vocab-notes-section button', 'Save note');
    await wait('!document.querySelector(".vocab-notes-section fieldset").disabled');
    assert.equal(ops.listVocabulary().find(entry => entry.id === boat.id).note, value);
  }
  const checks = [];
  try {
    await wait('!!document.querySelector("#notebook .app-notice[role=alert]")'); await nav('Vocab');
    assert.ok(await evaluate('document.querySelector(".vocab-empty").textContent.includes("could not be loaded")'));
    failRead = false; await click('#notebook button', 'Retry loading vocabulary');
    await wait('document.querySelectorAll(".vocab-row").length === 2');
    checks.push('initial read failure is distinct from empty vocabulary and can retry');
    await selectBoat();
    await click('.vocab-generate'); await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    await click('.workspace-target-dialog label', '船'); await click('.workspace-target-dialog label', '苹果');
    await click('.workspace-target-dialog button[type=submit]'); await wait('!!document.querySelector(".story-generation-dialog[open]")');
    await click('button[aria-label="Close generation dialog"]'); await nav('Vocab');
    await saveNote('After target selection');
    const previewCount = await evaluate('document.querySelectorAll(".story-selected-targets li").length');
    await fs.writeFile(path.join(output, 'target-selection.json'), JSON.stringify({ sqliteTargets: ops.listVocabulary().filter(entry => entry.selected).map(entry => entry.id), renderedPreviewCount: previewCount, expectedCount: 2 }, null, 2));
    assert.equal(previewCount, 2, 'Saving a note must preserve both targets in the rendered generation preview (currently closed).');
    checks.push('target selection followed by note saving');

    // A read triggered by generation carries new historical Contexts but old notes.
    await click('.vocab-generate'); await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    await click('.workspace-target-dialog button[type=submit]'); await wait('!!document.querySelector(".story-generation-dialog[open]")');
    generationGate = new Promise(resolve => { releaseGeneration = resolve; });
    await click('.story-generation-dialog footer button', 'Generate story'); await click('button[aria-label="Close generation dialog"]');
    await nav('Vocab'); await selectBoat(); await noteDraft('Draft during generation');
    blockRead = true; releaseGeneration(); generationGate = null;
    await waitHost(() => !!releaseRead);
    assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), 'Draft during generation');
    assert.ok(await evaluate('document.querySelector("#notebook").checkVisibility()'));
    await click('.vocab-notes-section button', 'Save note');
    await wait('!document.querySelector(".vocab-notes-section fieldset").disabled');
    const beforeRetry = reads; releaseRead();
    await wait('[...document.querySelectorAll(".vocab-context-source-label")].some(el => el.textContent === "Ownership story 2")');
    assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), 'Draft during generation');
    assert.ok(reads > beforeRetry, 'The interrupted read must retry to converge notes and Contexts.');
    assert.ok(await evaluate('document.querySelector("#notebook").checkVisibility()'));
    checks.push('generation completes during draft; interrupted read retains new Contexts and saved note');

    // A newer read can supersede an older blocked reply without waiting for it.
    blockRead = true; await click('.vocab-generate'); await waitHost(() => !!releaseRead);
    await nav('Content'); await click('.story-vocabulary-row button', '배');
    await wait('document.querySelector("#notebook").checkVisibility()');
    releaseRead(); await delay(100);
    assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), 'Draft during generation');
    await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    await click('button[aria-label="Close vocabulary selection"]');
    checks.push('newer read supersedes delayed reply');

    failRead = true; await nav('Content'); await click('.story-vocabulary-row button', '배');
    await wait('!!document.querySelector(".app-notice-floating[role=alert]")'); await nav('Vocab');
    assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 2);
    await saveNote('Saved while refresh failed');
    assert.equal(ops.listVocabulary().find(entry => entry.id === boat.id).note, 'Saved while refresh failed');
    failRead = false;
    checks.push('refresh failure retains list; successful write needs no reload');
    failSave = true; await noteDraft('Retained on failure');
    await click('.vocab-notes-section button', 'Save note');
    await wait('!document.querySelector(".vocab-notes-section fieldset").disabled');
    assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), 'Retained on failure');
    assert.equal(ops.listVocabulary().find(entry => entry.id === boat.id).note, 'Saved while refresh failed');
    failSave = false; await click('.vocab-notes-section button', 'Cancel');
    checks.push('failed note writes preserve drafts and committed data');

    await nav('Content');
    await evaluate(`(() => { const node = [...document.querySelectorAll('.artifact-korean')].find(el => el.checkVisibility()).lastChild.firstChild, range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 3); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); })()`);
    await wait('!!document.querySelector(".vocabulary-selection input[name=meaningZh]")');
    await wait('!document.querySelector(".vocabulary-selection button[type=submit]").disabled');
    await field('.vocabulary-selection input[name=meaningZh]', '有'); await click('.vocabulary-selection button[type=submit]');
    await wait('document.querySelectorAll(".story-collected-vocabulary .story-vocabulary-row").length === 1 && document.querySelectorAll(".artifact-korean mark").length === 2');
    await nav('Vocab'); await click('.vocab-row', '有');
    assert.equal(await evaluate('document.querySelectorAll(".vocab-context-thumbnail[data-kind=artifact]").length'), 1);
    await evaluate('window.confirm = () => true; void 0');
    failDelete = true; await click('.vocab-entry-menu summary'); await click('.vocab-delete');
    await wait('!!document.querySelector("#notebook .app-notice[role=alert]")');
    assert.equal(ops.listVocabulary().length, 3); failDelete = false;
    await click('.vocab-entry-menu summary'); await click('.vocab-delete');
    await wait('document.querySelectorAll(".vocab-row").length === 2'); await nav('Content');
    await wait('!document.querySelector(".story-collected-vocabulary") && document.querySelectorAll(".artifact-korean mark").length === 1');
    assert.equal(ops.listArtifactVocabulary(seedStory.id).length, 0);
    checks.push('collection and deletion synchronize Notebook and Story positions');

    await nav('Vocab'); await selectBoat();
    await click('.vocab-context-card button', 'Open');
    await wait('document.querySelector(".workspace-content-grid").checkVisibility() && [...document.querySelectorAll("button")].some(el => el.textContent === "Process again" && !el.disabled)');
    await click('button', 'Process again');
    await wait('!document.querySelector(".workspace-stage-status [role=status]")');
    await nav('Vocab'); await selectBoat();
    await wait('document.querySelectorAll(".vocab-context-thumbnail[data-kind=media]").length === 1');
    const afterTranscribe = ops.listVocabulary().find(entry => entry.id === boat.id);
    assert.equal(afterTranscribe.contexts.filter(context => context.source.type === 'media').length, 1);
    assert.ok(afterTranscribe.contexts.some(context => context.source.type === 'artifact'));
    assert.equal(afterTranscribe.note, 'Saved while refresh failed'); assert.equal(afterTranscribe.selected, true);
    assert.equal(ops.listArtifacts().find(artifact => artifact.id === seedStory.id).targets[0].id, boat.id);
    checks.push('retranscription clears only old media sources and retains note, targets and historical snapshots');

    await evaluate('window.confirm = () => true; void 0');
    await click('.vocab-entry-menu summary'); await click('.vocab-delete');
    await wait('document.querySelectorAll(".vocab-row").length === 1');
    assert.equal(await evaluate('document.querySelectorAll(".story-selected-targets li").length'), 1);
    assert.equal(ops.listVocabulary().filter(entry => entry.selected).length, 1);
    assert.equal(ops.listArtifacts().find(artifact => artifact.id === seedStory.id).targets[0].id, boat.id);
    checks.push('deleting a selected word updates targets without rewriting snapshots');
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, checks, reads, generated, appleId: apple.id }, null, 2));
    ops.close(); app.quit();
  } catch (error) {
    await fs.writeFile(path.join(output, 'failure.png'), (await window.webContents.capturePage()).toPNG());
    await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ checks, error: String(error), notices: await evaluate('[...document.querySelectorAll("[role=alert]")].map(el => el.textContent)') }, null, 2));
    throw error;
  }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
