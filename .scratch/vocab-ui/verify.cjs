/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
    await fs.mkdir(parent, { recursive: true });
    const output = await fs.mkdtemp(path.join(parent, 'vocab-native-'));
    require('node:child_process').execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', path.join(output, 'sample.wav')], { windowsHide: true });
    for (const phase of ['initial', 'restart']) {
      const env = { ...process.env, DEEPSEEK_API_KEY: '' }; delete env.ELECTRON_RUN_AS_NODE;
      await new Promise((resolve, reject) => {
        const child = require('node:child_process').spawn(require('electron'), [__filename, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Vocabulary ${phase} acceptance exited ${code}; ${output}`)));
      });
    }
    console.log(`PASS: native Vocabulary acceptance and profile restart. Evidence: ${output}`); return;
  }
  const { app, BrowserWindow, protocol, ipcMain } = require('electron');
  const output = process.argv[2], restart = process.argv[3] === 'restart', profile = path.join(output, 'profile');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  require('node:fs').mkdirSync(profile, { recursive: true }); app.setPath('userData', profile);
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const processor = async (mode, _signal, _file, input) => mode === 'probe' ? { duration: 3 } : mode === 'lookup'
    ? { surface: input.surface, lemma: '배', language: 'ko', candidates: [] }
    : { segments: [{ start: 0, end: 3, text: '배가 배에 있어요.', groups: ['배가', ' 배에 있어요.'] }] };
  const generator = async input => ({ title: 'A saved boat story', requestedModel: 'deepseek-flash', sentences: [{ parts: [{ text: '배가 ', targetId: input.targets[0].id }, { text: '있어요.', targetId: null }], translationZh: '有一条船。' }] });
  await app.whenReady();
  const ops = new DesktopOperations(profile, processor, generator);
  let seed;
  if (!restart) {
    const media = await ops.transcribe((await ops.importMedia(path.join(output, 'sample.wav'))).id, 'fixture');
    const boat = ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '船', context: { surface: '배', surfaceStart: 3, sentence: media.segments[0].text, source: { type: 'media', mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: 0 } } });
    const other = ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '梨' });
    const english = ops.saveVocabulary({ language: 'en', lemma: 'learn', meaningZh: '学习' });
    ops.selectVocabulary([boat.id, english.id]);
    const story = await ops.generateArtifact([boat.id], '', 'seed-story', 'fixture-key');
    seed = { media, boat, other, english, story }; await fs.writeFile(path.join(output, 'seed.json'), JSON.stringify(seed));
  } else seed = JSON.parse(await fs.readFile(path.join(output, 'seed.json'), 'utf8'));

  let failList = !restart, blockList = false, releaseList, failSave = false, failDelete = false, reads = 0, providerCalls = 0;
  const register = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => register(channel, (event, ...args) => {
    if (channel === 'inflow:listVocabulary') {
      reads++; if (failList) throw new Error('Fixture vocabulary loading failure.');
      if (blockList) { blockList = false; return new Promise(resolve => { releaseList = () => resolve([]); }); }
    }
    if (channel === 'inflow:lookupVocabulary') return ops.lookupVocabulary(...args);
    if (channel === 'inflow:saveVocabulary' && failSave) throw new Error('Fixture note write failure.');
    if (channel === 'inflow:deleteVocabulary' && failDelete) throw new Error('Fixture deletion failure.');
    return handler(event, ...args);
  });
  global.fetch = async () => { providerCalls++; throw new Error('Native acceptance must not contact a cloud provider.'); };
  const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
  const initialize = GenerationCredential.prototype.initialize;
  GenerationCredential.prototype.initialize = function () { return initialize.call(this, profile); };
  const fixture = `(() => {
    const synth = speechSynthesis, original = synth.getVoices.bind(synth);
    window.voiceFixture = { ready: false, missing: false, calls: [], canceled: 0, current: null, original };
    synth.getVoices = () => voiceFixture.ready ? original().filter(v => !voiceFixture.missing || !v.lang.startsWith('ko')) : [];
    synth.speak = utterance => { voiceFixture.current = utterance; voiceFixture.calls.push({text: utterance.text, lang: utterance.lang, local: utterance.voice.localService}); };
    synth.cancel = () => { voiceFixture.canceled++; };
  })();`;
  const handleProtocol = protocol.handle.bind(protocol);
  protocol.handle = (scheme, handler) => handleProtocol(scheme, async request => {
    const response = await handler(request);
    if (new URL(request.url).pathname !== '/') return response;
    return new Response((await response.text()).replace('<head>', '<head><script>' + fixture + '</script>'), { status: response.status, headers: response.headers });
  });
  app.on('browser-window-created', (_event, window) => { window.hide(); window.webContents.setBackgroundThrottling(false); });
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(root, 'build/desktop/desktop/main.js'));
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let count = 0; count < 200; count++) { if (await evaluate(code)) return; await delay(50); }
    await fs.writeFile(path.join(output, 'failure.png'), (await window.webContents.capturePage()).toPNG());
    throw new Error(`Timed out: ${code}; notices: ${await evaluate('[...document.querySelectorAll("[role=alert]")].map(el => el.textContent).join("; ")')}`);
  }
  async function click(selector, text = '') {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.checkVisibility() && el.textContent.includes(${JSON.stringify(text)})); if (!el || el.disabled) return false; el.click(); return true; })()`), `${selector}: ${text}`);
    await delay(60);
  }
  async function field(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el.checkVisibility()) throw new Error('Hidden field'); const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); })()`);
    await delay(60);
  }
  const selected = () => evaluate('document.querySelector(".vocab-row[aria-pressed=true] .vocab-row-meaning")?.textContent');
  async function selectMeaning(meaning) { await click('.vocab-row', meaning); }
  async function language(name) { await click('.vocab-language-filter summary'); await click('.vocab-language-filters button', name); }
  async function nav(name) { await click('.workspace-topnav button', name); }
  const note = 'Remember this sense.\nSecond line';
  window.setContentSize(1440, 900);
  await wait('!!document.querySelector("#notebook")'); await nav('Vocab');
  if (restart) {
    await selectMeaning('学习');
    await click('.vocab-notes-section summary');
    assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), note);
    assert.equal(ops.listVocabulary().some(entry => entry.id === seed.boat.id), false);
    assert.equal(ops.listArtifacts().find(item => item.id === seed.story.id).targets[0].id, seed.boat.id);
    assert.equal(ops.list().length, 1); assert.equal(providerCalls, 0);
    await fs.writeFile(path.join(output, 'restart.json'), JSON.stringify({ passed: true, noteRestored: true, deletionRestored: true, historicalStoryPreserved: true, providerCalls }));
    ops.close(); app.quit(); return;
  }
  await wait('!!document.querySelector(".vocab-error button")');
  assert.ok(await evaluate('document.querySelector(".vocab-empty").textContent.includes("could not be loaded")'));
  failList = false; blockList = true; await click('.vocab-error button');
  await nav('Library'); await click('.workspace-library-item', 'A saved boat story');
  await wait('document.querySelector(".story-sentences")?.checkVisibility()'); await click('.story-vocabulary-row button');
  await wait('document.querySelector("#notebook").checkVisibility() && document.querySelectorAll(".vocab-row").length === 3');
  releaseList(); await delay(100);
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 3);
  assert.equal(await evaluate('!!document.querySelector(".vocab-error")'), false); assert.equal(await selected(), '船');
  assert.equal(await evaluate('document.querySelector(".vocab-context-copy mark").parentElement.firstChild.textContent'), '배가 ');
  const context = seed.boat.contexts[0];
  ops.saveVocabulary({ language: 'ko', lemma: '배', meaningZh: '船', context: { ...context, surfaceStart: 0 } });
  await nav('Library'); await click('.workspace-library-item', 'A saved boat story');
  await wait('document.querySelector(".story-sentences")?.checkVisibility()');
  await click('.story-vocabulary-row button'); await wait('document.querySelector("#notebook").checkVisibility()');
  assert.equal(await selected(), '船'); assert.equal(await evaluate('document.querySelectorAll(".vocab-context-copy mark").length'), 2);
  assert.equal(await evaluate('document.querySelector(".vocab-context-copy p").textContent'), '배가 배에 있어요.');
  assert.equal(await evaluate('document.querySelector(".vocab-notes-section").open'), false);
  assert.ok(await evaluate('document.querySelector(".vocab-notes-section").getBoundingClientRect().height < 60'));

  await wait('voiceFixture.original().some(v => v.localService && v.lang.startsWith("ko"))');
  assert.equal(await evaluate('document.querySelector(".vocab-pronunciation").disabled'), true);
  await evaluate('voiceFixture.ready = true; speechSynthesis.dispatchEvent(new Event("voiceschanged"))');
  await wait('!document.querySelector(".vocab-pronunciation").disabled');
  await click('.vocab-pronunciation');
  assert.deepEqual(await evaluate('voiceFixture.calls.at(-1)'), { text: '배', lang: 'ko-KR', local: true });
  assert.equal(await evaluate('document.querySelector(".vocab-pronunciation").getAttribute("aria-pressed")'), 'true');
  await evaluate('window.staleSpeech = voiceFixture.current'); await click('.vocab-pronunciation');
  await click('.vocab-pronunciation'); await evaluate('staleSpeech.onend()');
  assert.equal(await evaluate('document.querySelector(".vocab-pronunciation").getAttribute("aria-pressed")'), 'true');
  await evaluate('voiceFixture.current.onerror({ error: "synthesis-failed" })');
  await wait('!!document.querySelector(".vocab-pronunciation-error[role=alert]")');
  await click('.vocab-pronunciation'); await selectMeaning('梨');
  assert.ok(await evaluate('voiceFixture.canceled >= 2'));
  await evaluate('voiceFixture.missing = true; speechSynthesis.dispatchEvent(new Event("voiceschanged"))');
  await wait('document.querySelector(".vocab-pronunciation").disabled');
  assert.ok(await evaluate('document.querySelector(".vocab-pronunciation-error").textContent.includes("Korean")'));
  await evaluate('voiceFixture.missing = false; speechSynthesis.dispatchEvent(new Event("voiceschanged"))');

  await selectMeaning('学习'); await click('.vocab-pronunciation'); await nav('Content');
  assert.ok(await evaluate('voiceFixture.canceled >= 3')); await nav('Vocab');
  await click('.vocab-notes-section summary');
  assert.ok(await evaluate('document.querySelector(".vocab-notes-section textarea").getBoundingClientRect().height < 100'));
  await field('.vocab-notes-section textarea', note);
  await selectMeaning('船'); assert.equal(await selected(), '学习');
  await nav('Content'); assert.ok(await evaluate('document.querySelector("#notebook").checkVisibility()'));
  await field('.vocab-search input', '船'); assert.equal(await evaluate('document.querySelector(".vocab-search input").value'), '');
  failSave = true; await click('.vocab-notes-section button', 'Save note'); await wait('document.querySelector(".vocab-error")?.textContent.includes("write failure")');
  assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), note);
  failSave = false; failList = true; const beforeSaveReads = reads;
  await click('.vocab-notes-section button', 'Save note'); await wait('document.querySelector(".vocab-notes-section summary").textContent.includes("Saved")');
  assert.equal(reads, beforeSaveReads); assert.equal(await evaluate('!!document.querySelector(".vocab-error")'), false); failList = false;
  await field('.vocab-notes-section textarea', 'Discard this draft'); await click('.vocab-notes-section button', 'Cancel');
  assert.equal(await evaluate('document.querySelector(".vocab-notes-section textarea").value'), note);
  await nav('Content');
  await evaluate(`(() => { const node = document.querySelector('.artifact-korean mark').firstChild, range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 1); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); })()`);
  await wait('!!document.querySelector(".vocabulary-selection input[name=meaningZh]")');
  await wait('!document.querySelector(".vocabulary-selection button[type=submit]").disabled');
  await field('.vocabulary-selection input[name=meaningZh]', '梨'); await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection") && [...document.querySelectorAll(".vocab-row")].some(el => el.textContent.includes("A saved boat story"))');
  await nav('Vocab'); assert.equal(await selected(), '学习');

  await click('.vocab-filters button', 'Media'); await language('Korean');
  await click('.vocab-add-word'); await field('input[name=lemma]', 'visible'); await field('input[name=meaningZh]', '可见'); await field('.vocab-editor select', 'en');
  await click('.vocab-editor button[type=submit]'); await wait('document.querySelector(".vocab-detail-heading h2")?.textContent === "visible"');
  assert.equal(await selected(), '可见'); assert.ok(await evaluate('document.querySelector(".vocab-filters button[aria-pressed=true]").textContent.startsWith("All")'));
  assert.ok(await evaluate('document.querySelector(".vocab-language-filters button[aria-pressed=true]").textContent.startsWith("English")'));
  await field('.vocab-search input', 'visible'); await click('.vocab-edit'); await field('input[name=lemma]', 'renamed'); await click('.vocab-editor button[type=submit]');
  await wait('document.querySelector(".vocab-detail-heading h2")?.textContent === "renamed"'); assert.equal(await evaluate('document.querySelector(".vocab-search input").value'), '');
  await language('All'); await click('.vocab-generate'); await wait('!!document.querySelector(".workspace-target-dialog[open]")');
  assert.equal(await evaluate('document.querySelector(".workspace-target-dialog button[type=submit]").disabled'), true);
  assert.equal(await evaluate('document.querySelectorAll(".workspace-target-dialog input:checked").length'), 2);
  await click('.workspace-target-dialog label', '学习'); assert.equal(await evaluate('document.querySelector(".workspace-target-dialog button[type=submit]").disabled'), false);
  await click('button[aria-label="Close vocabulary selection"]');

  await field('.vocab-search input', 'learn'); await language('English'); await nav('Content');
  await click('.story-dropdown:not(.story-options) summary'); await click('.story-dropdown:not(.story-options) button', '배');
  await wait('document.querySelector("#notebook").checkVisibility()'); assert.equal(await selected(), '船');
  await evaluate('window.confirmations = []; window.confirm = message => { confirmations.push(message); return false; }; void 0');
  await click('.vocab-delete'); assert.equal(await selected(), '船');
  assert.ok(await evaluate('confirmations[0].includes("배") && confirmations[0].includes("船")'));
  await evaluate('window.confirm = message => { confirmations.push(message); return true; }; void 0'); failDelete = true;
  await click('.vocab-delete'); await wait('document.querySelector(".vocab-error")?.textContent.includes("deletion failure")'); assert.equal(await selected(), '船');
  failDelete = false; await click('.vocab-delete'); await wait('![...document.querySelectorAll(".vocab-row-meaning")].some(el => el.textContent === "船")');
  assert.equal(ops.listVocabulary().some(entry => entry.id === seed.boat.id), false); assert.equal(ops.listArtifacts().find(item => item.id === seed.story.id).targets[0].id, seed.boat.id); assert.equal(ops.list().length, 1);
  await nav('Content'); await click('.story-vocabulary-row button');
  await wait('document.querySelector(".workspace-notice")?.textContent.includes("no longer")');
  assert.ok(await evaluate('document.querySelector(".story-sentences").checkVisibility()'));
  assert.equal(ops.listVocabulary().length, 3); assert.equal(providerCalls, 0);
  await nav('Vocab'); await language('All'); await selectMeaning('学习');
  await fs.writeFile(path.join(output, 'vocab.png'), (await window.webContents.capturePage()).toPNG());
  window.setContentSize(1080, 720); await delay(100);
  await fs.writeFile(path.join(output, 'vocab-narrow.png'), (await window.webContents.capturePage()).toPNG());
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, reads, providerCalls, speechCalls: await evaluate('voiceFixture.calls'), confirmations: await evaluate('confirmations'), repeatedOccurrenceMarks: 2 }, null, 2));
  ops.close(); app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
