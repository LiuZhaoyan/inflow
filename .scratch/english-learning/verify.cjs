/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const sample = path.resolve(process.argv[2] || '.scratch/desktop-learning/generated-samples/english-audio/practice.wav');
    await fs.access(sample);
    await fs.mkdir(path.join(root, '.scratch/desktop-learning/generated-samples'), { recursive: true });
    const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/english-native-'));
    const env = { ...process.env, INFLOW_PYTHON: path.join(root, '.venv-win/python.exe'), INFLOW_MODELS_DIR: path.join(root, '.models') };
    delete env.ELECTRON_RUN_AS_NODE;
    for (const phase of ['first', 'restart']) {
      await new Promise((resolve, reject) => {
        const child = spawn(require('electron'), [__filename, sample, output, phase], { env, stdio: 'inherit', windowsHide: true });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`English ${phase} acceptance exited ${code}`)));
      });
    }
    return;
  }
  const { app, BrowserWindow, protocol, dialog } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  const output = path.resolve(process.argv[3]), restart = process.argv[4] === 'restart';
  const samplesRoot = path.resolve(root, '.scratch/desktop-learning/generated-samples');
  const relativeOutput = path.relative(samplesRoot, output);
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) throw new Error('Profile must remain inside isolated generated samples.');
  const profile = path.join(output, 'profile'), sample = process.argv[2];
  app.setPath('userData', profile);
  process.env.DEEPSEEK_API_KEY = 'english-native-fixture';
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const seed = new DesktopOperations(profile, async mode => mode === 'probe' ? { duration: 6 } : { segments: [{ start: 0, end: 2, text: '친구를 만났어요.', groups: ['친구를', '만났어요.'] }] },
    async input => ({ title: '한국어 이야기', requestedModel: 'deepseek-flash', sentences: [{ parts: [{ text: '친구', targetId: input.targets[0].id }, { text: '를 만났어요.', targetId: null }], translationZh: '见到了朋友。' }] }));
  const korean = restart ? seed.list().find(item => item.language === 'ko') : await seed.transcribe((await seed.importMedia(sample, 'ko')).id, 'seed');
  const koreanWord = restart ? seed.listVocabulary().find(item => item.language === 'ko') : seed.saveVocabulary({ language: 'ko', lemma: '친구', meaningZh: '朋友' });
  if (!restart) await seed.generateArtifact([koreanWord.id], '', 'korean-story', 'fixture');
  else assert.equal(seed.getImportLanguage(), 'en');
  seed.close();

  const confirmations = [], requests = [], errors = [];
  let cancelImport = false;
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sample] });
  dialog.showMessageBox = async (_window, options) => { confirmations.push(options); return { response: cancelImport ? 2 : 1 }; };
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  const realFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url) !== 'https://api.deepseek.com/responses') return realFetch(url, options);
    const body = JSON.parse(options.body), input = JSON.parse(body.input), field = body.text.format.name;
    requests.push({ input, field });
    const result = field === 'translation' ? { translation: '放学后，孩子们见到了朋友。' } : {
      title: 'English friends ' + requests.length,
      sentences: [{ parts: input.targets.flatMap(target => [{ text: target.lemma, targetId: target.id }, { text: ' met a well-known friend. ', targetId: null }]), translationZh: '见到了一位知名的朋友。' }],
    };
    return Response.json({ id: 'english-native-fixture', status: 'completed', model: 'fixture', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  };
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code, timeout = 45000) {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(code)) return; await delay(100); }
    await fs.writeFile(path.join(output, 'failure.png'), (await window.webContents.capturePage()).toPNG());
    const notice = await evaluate('[...document.querySelectorAll("[role=alert],.vocabulary-selection [role=status]")].map(el => el.textContent).join("; ")');
    throw new Error(`Timed out: ${code}; notices: ${notice}; evidence: ${output}`);
  }
  async function click(selector) {
    assert.ok(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`), selector);
    await delay(100);
  }
  async function textButton(selector, text) {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)} || el.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`), text);
    await delay(100);
  }
  async function field(selector, value, event = 'input') {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`);
    await delay(100);
  }
  async function select(selector, surface, native = false) {
    const rect = await evaluate(`(() => {
      document.activeElement?.blur(); const root = document.querySelector(${JSON.stringify(selector)}), offset = root.textContent.indexOf(${JSON.stringify(surface)});
      if (offset < 0) throw new Error('Missing selection: ' + root.textContent);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), range = document.createRange(); let count = 0, node, started = false;
      while ((node = walker.nextNode())) { const end = count + node.textContent.length;
        if (!started && offset < end) { range.setStart(node, offset - count); started = true; }
        if (started && offset + ${surface.length} <= end) { range.setEnd(node, offset + ${surface.length} - count); break; } count = end; }
      const rect = range.getBoundingClientRect();
      if (!${native}) { const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); }
      return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
    })()`);
    if (native) {
      for (const type of ['mouseMove', 'mouseDown', 'mouseMove', 'mouseUp']) {
        window.webContents.sendInputEvent({ type, button: 'left', clickCount: 1, x: Math.round(type === 'mouseUp' || type === 'mouseMove' && native === 'down' ? rect.right : rect.left), y: Math.round(rect.y) });
        if (type === 'mouseDown') native = 'down';
        await delay(100);
      }
    }
    await wait('!!document.querySelector(".vocabulary-selection")');
  }
  if (restart) {
    await wait('!!document.querySelector(".story-sentences")');
    const saved = await evaluate('Promise.all([window.inflow.list(),window.inflow.listVocabulary(),window.inflow.listArtifacts()])');
    assert.equal(saved[0].length, 2); assert.equal(saved[0].find(item => item.id === korean.id).language, 'ko');
    assert.equal(saved[1].find(item => item.lemma === 'well-known').contexts[0].source.type, 'artifact');
    assert.equal(saved[2].filter(item => item.language === 'en').length, 2);
    assert.equal(requests.length, 0);
    assert.equal(await evaluate('document.querySelector(".vocab-language-filters button[aria-pressed=true]").textContent.startsWith("All")'), true);
    assert.equal(errors.length, 0, errors.join('\n'));
    await fs.writeFile(path.join(output, 'restart.json'), JSON.stringify({ passed: true, providerCalls: 0, englishArtifacts: 2, koreanMediaPreserved: true }, null, 2));
    console.log('PASS: second native Electron process restores English/Korean state without provider access'); app.quit(); return;
  }
  await wait('!!document.querySelector(".workspace-sentence-text")');
  await select('.workspace-sentence-text', '친구를');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "친구"');
  assert.ok(await evaluate('[...document.querySelectorAll(".vocabulary-selection option")].some(option => option.textContent === "朋友")'));
  await textButton('.vocabulary-selection button', 'Discard');
  await textButton('.workspace-topnav button', 'Library');
  await textButton('.workspace-library-footer button', 'Import media');
  await wait('window.inflow.list().then(items => items.some(item => item.language === "en" && item.segments.length > 0))', 180000);
  const media = await evaluate('window.inflow.list().then(items => items.find(item => item.language === "en"))');
  assert.equal(confirmations[0].defaultId, 0); assert.deepEqual(confirmations[0].buttons, ['韩语', '英语', '取消']);
  assert.ok(media.segments.some(segment => segment.text.includes('children')), JSON.stringify(media.segments));
  await fs.writeFile(path.join(output, 'transcript.json'), JSON.stringify(media.segments, null, 2));
  cancelImport = true;
  assert.equal(await evaluate('window.inflow.importMedia()'), null); assert.equal(confirmations[1].defaultId, 1);
  assert.equal(await evaluate('window.inflow.list().then(items => items.length)'), 2);
  await wait('!document.querySelector(".workspace-library-dialog").open');
  await textButton('.workspace-mode-switch button', 'Sentence');
  await click('.workspace-sentence-transport button[aria-label="Play"]'); await delay(350);
  assert.ok(await evaluate('document.querySelector("audio,video").currentTime > 0'));
  await click('.workspace-sentence-transport button[aria-label="Pause"]');
  await textButton('.workspace-mode-switch button', 'Full'); await textButton('.workspace-mode-switch button', 'Sentence');
  await textButton('.workspace-mask-toggle', 'Set masks');
  await click('.workspace-mask-group');
  assert.equal(await evaluate('document.querySelector(".workspace-mask-group").getAttribute("aria-pressed")'), 'true');
  await click('.workspace-mask-group'); await click('.workspace-mask-toggle');
  const cloudBefore = requests.length;
  await select('.workspace-sentence-text', 'children', true);
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "child"');
  assert.equal(requests.length, cloudBefore);
  await field('.vocabulary-selection input[name=meaningZh]', '孩子');
  await click('.workspace-sentence-transport button[aria-label="Next sentence"]');
  assert.ok(await evaluate('document.querySelector(".vocabulary-selection [role=alert]").textContent.includes("Save or discard")'));
  await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection")');
  const child = await evaluate('window.inflow.listVocabulary().then(items => items.find(item => item.language === "en" && item.lemma === "child"))');
  assert.equal(child.contexts[0].surface, 'children'); assert.equal(child.contexts[0].source.mediaId, media.id);
  await select('.workspace-sentence-text', 'child');
  assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection input")'), false);
  await textButton('.vocabulary-selection button', 'Close');
  await textButton('.workspace-topnav button', 'Vocab');
  await wait('!document.querySelector(".workspace-vocab").hidden');
  assert.equal(await evaluate('document.querySelector(".vocab-language-filters button[aria-pressed=true]").textContent.startsWith("All")'), true);
  await evaluate(`window.inflow.selectVocabulary([${JSON.stringify(child.id)},${JSON.stringify(koreanWord.id)}])`);
  await textButton('.vocab-language-filters button', 'English');
  assert.equal(await evaluate('document.querySelectorAll(".vocab-row").length'), 1);
  await click('.vocab-add-word');
  assert.equal(await evaluate('document.querySelector(".vocab-editor select[name=language]").value'), 'en');
  await field('.vocab-editor input[name=lemma]', 'notebook');
  await field('.vocab-editor input[name=meaningZh]', '笔记本');
  await click('.vocab-editor button[type=submit]');
  await wait('!document.querySelector(".vocab-editor")');
  assert.equal(await evaluate('window.inflow.listVocabulary().then(items => items.find(item => item.lemma === "notebook").language)'), 'en');
  assert.equal(await evaluate('window.inflow.listVocabulary().then(items => items.filter(item => item.selected).length)'), 2);
  await textButton('.vocab-generate', 'Generate story');
  await wait('!!document.querySelector(".workspace-target-dialog[open]")');
  assert.ok(await evaluate('document.querySelector(".workspace-target-dialog").textContent.includes("one source language")'));
  const beforeMixed = requests.length;
  await assert.rejects(evaluate(`window.inflow.generateArtifact([${JSON.stringify(child.id)},${JSON.stringify(koreanWord.id)}], '', 'mixed', '')`));
  assert.equal(requests.length, beforeMixed);
  await evaluate(`(() => { const labels = [...document.querySelectorAll('.workspace-target-dialog label')]; const label = labels.find(el => el.textContent.includes('친구')); label.querySelector('input').click(); })()`);
  await click('.workspace-target-dialog button[type=submit]');
  await wait('!!document.querySelector(".story-generation-dialog[open]")');
  await textButton('.story-generation-dialog button', 'Generate story');
  await wait('window.inflow.listArtifacts().then(items => items.some(item => item.language === "en"))');
  await wait('!document.querySelector(".workspace-story").hidden');
  const first = await evaluate('window.inflow.listArtifacts().then(items => items.find(item => item.language === "en"))');
  assert.equal(first.targets[0].id, child.id); assert.equal(requests.at(-1).field, 'english_learning_passage');
  await select('.artifact-korean', 'well-known');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "well-known"');
  await wait('document.querySelector(".vocabulary-selection button[type=submit]")?.disabled === false');
  await field('.vocabulary-selection input[name=meaningZh]', '知名的'); await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection")');
  const known = await evaluate('window.inflow.listVocabulary().then(items => items.find(item => item.lemma === "well-known"))');
  assert.equal(known.contexts[0].source.artifactId, first.id);
  await evaluate(`window.inflow.selectVocabulary([${JSON.stringify(known.id)}])`);
  await textButton('.story-options button', 'Generate a story');
  await wait('!!document.querySelector(".workspace-target-dialog[open]")');
  await click('.workspace-target-dialog button[type=submit]');
  await wait('!!document.querySelector(".story-generation-dialog[open]")');
  await textButton('.story-generation-dialog button', 'Generate story');
  await wait('window.inflow.listArtifacts().then(items => items.filter(item => item.language === "en").length === 2)');
  await field('select[aria-label="Filter saved stories"]', 'ko', 'change');
  assert.equal(await evaluate('document.querySelectorAll("select[aria-label=\\"Open saved story\\"] option").length'), 2);
  await textButton('.workspace-topnav button', 'Library');
  assert.equal(await evaluate('document.querySelector(".workspace-library-filters button[aria-pressed=true]").textContent.startsWith("All")'), true);
  await textButton('.workspace-library-filters button', 'English');
  assert.equal(await evaluate('document.querySelectorAll(".workspace-library-entry").length'), 3);
  await click('button[aria-label="Close library"]');
  await fs.writeFile(path.join(output, 'story.png'), (await window.webContents.capturePage()).toPNG());
  window.webContents.reload();
  await wait('!!document.querySelector(".story-sentences")');
  const restored = await evaluate('Promise.all([window.inflow.list(),window.inflow.listVocabulary(),window.inflow.listArtifacts()])');
  assert.equal(restored[0].find(item => item.id === korean.id).language, 'ko');
  assert.equal(restored[1].find(item => item.id === known.id).contexts[0].source.artifactId, first.id);
  assert.equal(restored[2].filter(item => item.language === 'en').length, 2);
  assert.equal(await evaluate('document.querySelector(".vocab-language-filters button[aria-pressed=true]").textContent.startsWith("All")'), true);
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, profile, mediaId: media.id, dictionary: 'real', parser: 'real', transcription: 'real Whisper on offline synthetic speech', provider: 'deterministic fixture', requests: requests.length }, null, 2));
  console.log(`PASS: English native IPC, real ASR/parser/dictionary, import default, masks/playback, filters, mixed targets, two Story cycles and restored state\nEvidence: ${output}`);
  app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
