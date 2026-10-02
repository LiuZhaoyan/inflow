/* eslint @typescript-eslint/no-require-imports: off -- Native Electron acceptance bootstrap. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const env = { ...process.env, INFLOW_PYTHON: process.env.INFLOW_PYTHON || path.join(root, '.venv-win/python.exe') };
    delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve, reject) => {
      const child = spawn(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Acceptance exited ${code}`)));
    });
    return;
  }
  const { app, BrowserWindow, protocol, ipcMain } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  await fs.mkdir(path.join(root, '.scratch/desktop-learning/generated-samples'), { recursive: true });
  const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/translation-acceptance-'));
  const profile = path.join(output, 'profile');
  app.setPath('userData', profile);
  process.env.DEEPSEEK_API_KEY = 'native-fixture-only';
  const sample = path.join(output, 'Korean practice.wav');
  const wav = Buffer.alloc(44 + 16000 * 8 * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  await fs.writeFile(sample, wav);
  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const sentences = [
    { start: 0, end: 2, text: '어제 친구하고 학교에 갔어요.', groups: ['어제 친구하고', '학교에 갔어요.'] },
    { start: 2, end: 4, text: '꽃이 예뻐요.', groups: ['꽃이', '예뻐요.'] },
    { start: 4, end: 6, text: '학교에 갔다가 학교에 왔어요.', groups: ['학교에 갔다가', '학교에 왔어요.'] },
    { start: 6, end: 8, text: '😀 학교에 갔어요.', groups: ['😀 학교에', '갔어요.'] },
  ];
  let generated = 0;
  const ops = new DesktopOperations(profile, async mode => mode === 'probe' ? { duration: 8 } : { segments: sentences }, async input => ({
    requestedModel: 'native-fixture', title: '학교에 가요 ' + ++generated, sentences: [{ parts: [{ text: '친구', targetId: input.targets[0].id }, { text: '하고 학교에 갔어요.', targetId: null }], translationZh: '和朋友去了学校。' }, { parts: [{ text: '오늘 밥을 먹었어요.', targetId: null }], translationZh: '今天吃了饭。' }],
  }));
  const media = await ops.transcribe((await ops.importMedia(sample)).id, 'seed');
  const friend = ops.saveVocabulary({ lemma: '친구', meaningZh: '朋友' });
  const story = await ops.generateArtifact([friend.id], '', 'story', 'fixture');
  const secondStory = await ops.generateArtifact([friend.id], '', 'second-story', 'fixture');
  ops.close();
  const handlers = new Map();
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, callback) => { handlers.set(channel, callback); return handle(channel, callback); };
  const errors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  const register = protocol.registerSchemesAsPrivileged;
  protocol.registerSchemesAsPrivileged = () => {};
  const providerRequests = [], providerPending = [];
  let cloudMode = 'success';
  const realFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url) !== 'https://api.deepseek.com/responses') return realFetch(url, options);
    const body = JSON.parse(options.body), input = JSON.parse(body.input), field = body.text.format.name;
    providerRequests.push({ field, input });
    if (cloudMode === 'failure') return Response.json({}, { status: 503 });
    const complete = () => Response.json({ id: 'native-fixture', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(field === 'translation' ? { translation: '云端当前句译文' } : { meaningZh: '语境建议' }) }] }] });
    if (cloudMode === 'slow') return new Promise(resolve => providerPending.push(() => resolve(complete())));
    return complete();
  };
  const worker = require(path.join(root, 'build/desktop/src/listening/media-server.js'));
  const realWorker = worker.runProcessor;
  worker.runProcessor = (mode, ...args) => mode === 'translate' ? Promise.resolve({ translation: '本地参考译文' }) : realWorker(mode, ...args);
  require(path.join(root, 'build/desktop/desktop/main.js'));
  protocol.registerSchemesAsPrivileged = register;
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code, timeout = 40000) {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(code)) return; await delay(100); }
    throw new Error(`Timed out: ${code}`);
  }
  async function click(selector) {
    assert.ok(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`), selector);
    await delay(60);
  }
  async function clickText(selector, text) {
    assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el) return false; el.click(); return true; })()`), text);
    await delay(60);
  }
  async function fill(name, value) {
    await evaluate(`(() => { const el = document.querySelector('.vocabulary-selection input[name="${name}"]'); el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await delay(60);
  }
  async function reveal(choice = 'all') {
    await click('button[aria-label="揭晓原文"]'); await click(`[data-reveal-option="${choice}"]`);
  }
  async function select(selector, surface, occurrence = 0) {
    await evaluate(`(() => {
      document.activeElement?.blur();
      const root = document.querySelector(${JSON.stringify(selector)}), text = root.textContent;
      let offset = -1; for (let i = 0; i <= ${occurrence}; i++) offset = text.indexOf(${JSON.stringify(surface)}, offset + 1);
      if (offset < 0) throw new Error('Selection not found');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), range = document.createRange();
      let count = 0, node, started = false;
      while ((node = walker.nextNode())) {
        const end = count + node.textContent.length;
        if (!started && offset < end) { range.setStart(node, offset - count); started = true; }
        if (started && offset + ${surface.length} <= end) { range.setEnd(node, offset + ${surface.length} - count); break; }
        count = end;
      }
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    })()`);
    await wait('!!document.querySelector(".vocabulary-selection")');
  }
  function replace(channel, callback) { ipcMain.removeHandler(channel); handle(channel, callback); }
  const realLookup = () => replace('inflow:lookupVocabulary', handlers.get('inflow:lookupVocabulary'));
  await wait('!!document.querySelector(".workspace-sentence-text") && !!document.querySelector(".workspace-story .story-sentences")');
  await reveal();
  assert.equal(await evaluate('!!document.querySelector("button[aria-label=\\"Collect selected text\\"]")'), false);
  await click('button[aria-label="Show Chinese translation"]');
  await wait('document.querySelector(".workspace-translation")?.textContent.includes("云端当前句译文")');
  assert.equal(providerRequests.length, 1);
  assert.equal(providerRequests[0].input.text, sentences[0].text);
  assert.equal(providerRequests[0].input.next, sentences[1].text);
  await click('button[aria-label="Hide Chinese translation"]');
  await click('button[aria-label="Show Chinese translation"]');
  assert.equal(providerRequests.length, 1);
  await click('.workspace-player-toolbar button[aria-label="Next sentence"]');
  await click('button[aria-label="Show Chinese translation"]');
  await wait('document.querySelector(".workspace-translation")?.textContent.includes("云端当前句译文")');
  assert.equal(providerRequests.length, 2);
  await click('.workspace-player-toolbar button[aria-label="Previous sentence"]');
  await click('button[aria-label="Show Chinese translation"]');
  await wait('document.querySelector(".workspace-translation")?.textContent.includes("云端当前句译文")');
  assert.equal(providerRequests.length, 2);
  cloudMode = 'failure';
  await clickText('button', 'Translate again');
  await wait('!!document.querySelector(".workspace-translation [role=alert]")');
  assert.ok(await evaluate('document.querySelector(".workspace-translation").textContent.includes("云端当前句译文")'));
  await clickText('button', 'Use local reference translation');
  await wait('document.querySelector(".workspace-translation")?.textContent.includes("本地参考译文")');
  cloudMode = 'success';
  await reveal();
  console.log('PASS: explicit sentence translation, neighboring context, cached revisits, failed refresh preservation and explicit local fallback');
  const baseline = await evaluate('window.inflow.listVocabulary().then(entries => entries.length)');
  const wordRect = await evaluate(`(() => {
    const walker = document.createTreeWalker(document.querySelector('.workspace-sentence-text'), NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) { const start = node.textContent.indexOf('갔어요'); if (start < 0) continue;
      const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + 3);
      const rect = range.getBoundingClientRect(); return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 }; }
  })()`);
  window.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(wordRect.left), y: Math.round(wordRect.y) });
  window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: Math.round(wordRect.left), y: Math.round(wordRect.y) });
  window.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(wordRect.right), y: Math.round(wordRect.y) });
  await delay(180);
  assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection")'), false);
  window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: Math.round(wordRect.right), y: Math.round(wordRect.y) });
  await wait('!!document.querySelector(".vocabulary-selection")');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "가다"');
  assert.equal(await evaluate('window.inflow.listVocabulary().then(entries => entries.length)'), baseline);
  assert.equal(await evaluate('document.querySelector(".workspace-vocab").hidden'), true);
  assert.ok(await evaluate('[...document.querySelectorAll(".vocabulary-selection option")].some(el => el.textContent === "去")'));
  assert.equal(providerRequests.filter(entry => entry.field === 'meaningZh').length, 0);
  cloudMode = 'slow';
  await clickText('.vocabulary-selection button', 'Get contextual meaning · LLM');
  await wait('document.querySelector(".vocabulary-selection [role=status]")?.textContent.includes("Looking up")');
  assert.equal(providerPending.length, 1);
  await fill('meaningZh', '我的修改');
  providerPending.shift()();
  await wait('[...document.querySelectorAll(".vocabulary-selection button")].some(el => el.textContent === "Apply suggestion")');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=meaningZh]").value'), '我的修改');
  await clickText('.vocabulary-selection button', 'Apply suggestion');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=meaningZh]").value'), '语境建议');
  await evaluate(`(() => { const el = document.querySelector('.vocabulary-selection select'); el.value = '去'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await delay(100);
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=meaningZh]").value'), '去');
  cloudMode = 'failure';
  await clickText('.vocabulary-selection button', 'Get contextual meaning · LLM');
  await wait('!!document.querySelector(".vocabulary-selection [role=alert]")');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=meaningZh]").value'), '去');
  cloudMode = 'success';
  await fill('meaningZh', '前往');
  console.log('PASS: immediate offline candidates, explicit cloud lookup, failure preservation, edits protected and suggestion application');
  await fill('meaningZh', '去');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection strong").textContent'), '갔어요');
  const geometry = await evaluate(`(() => { const el = document.querySelector('.vocabulary-selection'), rect = el.getBoundingClientRect();
    return { fits: rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      scrolls: el.scrollHeight > el.clientHeight }; })()`);
  assert.equal(geometry.fits, true); assert.equal(geometry.scrolls, false);
  await fs.writeFile(path.join(output, 'selection.png'), (await window.webContents.capturePage()).toPNG());
  replace('inflow:saveVocabulary', () => { throw new Error('fixture save failure'); });
  await click('.vocabulary-selection button[type=submit]');
  await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("fixture save failure")');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=meaningZh]").value'), '去');
  replace('inflow:saveVocabulary', handlers.get('inflow:saveVocabulary'));
  await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection")');
  const go = await evaluate('window.inflow.listVocabulary().then(entries => entries.find(entry => entry.lemma === "가다"))');
  assert.equal(go.language, 'ko'); assert.equal(go.contexts[0].surface, '갔어요'); assert.equal(go.contexts[0].source.mediaId, media.id);
  console.log('PASS: real Kiwi, read-only lookup, focus preservation, save failure/retry and media provenance');

  await select('.workspace-sentence-text', '갔어요');
  await wait('document.querySelector(".vocabulary-selection input[name=meaningZh]")?.value === "去"');
  await clickText('.vocabulary-selection button', 'Get contextual meaning · LLM');
  await wait('document.querySelector(".vocabulary-selection input[name=meaningZh]")?.value === "语境建议"');
  await clickText('.vocabulary-selection button', 'Discard');
  await select('.workspace-sentence-text', '갔어요');
  await wait('document.querySelector(".vocabulary-selection input[name=meaningZh]")?.value === "去"');
  assert.equal(await evaluate('window.inflow.listVocabulary().then(entries => entries.length)'), baseline + 1);
  await clickText('.vocabulary-selection button', 'Discard');
  console.log('PASS: exact saved occurrence reuse and discarded cloud gloss not persisted');
  await select('.workspace-sentence-text', '친구하고 학교에');
  assert.ok(await evaluate('document.querySelector(".vocabulary-selection").textContent.includes("one word")'));
  assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection input")'), false);
  await clickText('.vocabulary-selection button', 'Close');
  await reveal('little');
  await evaluate(`(() => { document.activeElement?.blur(); const range = document.createRange(); range.selectNodeContents(document.querySelector('.workspace-sentence-text')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); })()`);
  await wait('!!document.querySelector(".vocabulary-selection")');
  assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection input")'), false);
  await clickText('.vocabulary-selection button', 'Close');
  await reveal();
  await select('.workspace-sentence-text', '학교에');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "학교"');
  await fill('meaningZh', '校园');
  await click('.workspace-player-toolbar button[aria-label="Next sentence"]');
  assert.equal(await evaluate('document.querySelector(".workspace-sentence-count").textContent.trim()'), '01 / 04');
  assert.ok(await evaluate('document.querySelector(".vocabulary-selection [role=alert]").textContent.includes("Save or discard")'));
  await clickText('.vocabulary-selection button', 'Discard');
  await click('.workspace-player-toolbar button[aria-label="Next sentence"]');
  assert.equal(await evaluate('document.querySelector(".workspace-sentence-count").textContent.trim()'), '02 / 04');
  console.log('PASS: multiword/hidden selection rejection and edited draft navigation guard');

  await reveal();
  const pending = [];
  replace('inflow:lookupVocabulary', (_event, input) => new Promise(resolve => pending.push({ input, resolve })));
  await select('.workspace-sentence-text', '예뻐요'); await wait('document.querySelector(".vocabulary-selection strong")?.textContent === "예뻐요"');
  await fill('lemma', '수정하다');
  assert.equal(pending.length, 1); pending.shift().resolve({ surface: '예뻐요', lemma: '예쁘다', language: 'ko' });
  await wait('!document.querySelector(".vocabulary-selection [role=status]")');
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=lemma]").value'), '수정하다');
  await clickText('.vocabulary-selection button', 'Discard');
  pending.length = 0;
  await click('.workspace-player-toolbar button[aria-label="Previous sentence"]'); await reveal();
  await select('.workspace-sentence-text', '학교에'); await wait('document.querySelector(".vocabulary-selection strong")?.textContent === "학교에"');
  await select('.workspace-sentence-text', '갔어요'); await wait('document.querySelector(".vocabulary-selection strong")?.textContent === "갔어요"');
  assert.equal(pending.length, 2);
  pending.shift().resolve({ surface: '학교에', lemma: '학교', language: 'ko' }); await delay(150);
  assert.equal(await evaluate('document.querySelector(".vocabulary-selection input[name=lemma]").value'), '갔어요');
  pending.shift().resolve({ surface: '갔어요', lemma: '가다', language: 'ko' });
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "가다"');
  await clickText('.vocabulary-selection button', 'Discard');
  replace('inflow:lookupVocabulary', () => { throw new Error('fixture lookup failure'); });
  await select('.workspace-sentence-text', '학교에');
  await wait('document.querySelector(".vocabulary-selection [role=status]")?.textContent.includes("fixture lookup failure")');
  await fill('lemma', '학교'); await fill('meaningZh', '学校'); await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection")'); realLookup();
  console.log('PASS: manual fallback and late results cannot replace edits or newer selections');

  await click('.workspace-player-toolbar button[aria-label="Next sentence"]');
  await click('.workspace-player-toolbar button[aria-label="Next sentence"]'); await reveal();
  let lastInput;
  replace('inflow:lookupVocabulary', (event, input, job) => { lastInput = input; return handlers.get('inflow:lookupVocabulary')(event, input, job); });
  await select('.workspace-sentence-text', '학교에', 1);
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "학교"');
  assert.equal(lastInput.start, sentences[2].text.lastIndexOf('학교에'));
  await clickText('.vocabulary-selection button', 'Discard');
  await click('.workspace-player-toolbar button[aria-label="Next sentence"]'); await reveal();
  await select('.workspace-sentence-text', '갔어요');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "가다"');
  assert.equal(lastInput.start, sentences[3].text.indexOf('갔어요'));
  await clickText('.vocabulary-selection button', 'Discard'); realLookup();
  console.log('PASS: repeated surface selection and UTF-16 offsets');

  await clickText('.workspace-topnav button', 'Library');
  await wait('document.querySelector(".workspace-library-dialog").open');
  assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll('.workspace-library-item')].find(el => el.textContent.includes(${JSON.stringify(story.title)})); if (!el) return false; el.click(); return true; })()`));
  await wait(`!document.querySelector('.workspace-story').hidden && document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(story.id)}`);
  await evaluate(`(() => {
    document.activeElement?.blur(); const range = document.createRange();
    range.setStart(document.querySelector('#artifact-sentence-0').firstChild.firstChild, 0);
    range.setEnd(document.querySelector('#artifact-sentence-1').firstChild.firstChild, 2);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange'));
  })()`);
  await wait('!!document.querySelector(".vocabulary-selection")');
  assert.equal(await evaluate('!!document.querySelector(".vocabulary-selection input")'), false);
  await clickText('.vocabulary-selection button', 'Close');
  const navigation = [];
  replace('inflow:openArtifact', (event, ...args) => new Promise(resolve => navigation.push(() => resolve(handlers.get('inflow:openArtifact')(event, ...args)))));
  async function chooseStory(id) {
    await evaluate(`(() => { const el = document.querySelector('select[aria-label="Open saved story"]'); el.value = ${JSON.stringify(id)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    while (!navigation.length) await delay(60);
  }
  await chooseStory(secondStory.id);
  await select('.artifact-korean', '갔어요'); await fill('meaningZh', '保留草稿');
  navigation.shift()();
  await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
  assert.equal(await evaluate('document.querySelector(".story-sentences").dataset.artifactId'), story.id);
  await clickText('.vocabulary-selection button', 'Discard');
  await chooseStory(secondStory.id);
  await select('.artifact-korean', '갔어요'); navigation.shift()();
  await wait(`document.querySelector('.story-sentences').dataset.artifactId === ${JSON.stringify(secondStory.id)} && !document.querySelector('.vocabulary-selection')`);
  replace('inflow:openArtifact', handlers.get('inflow:openArtifact'));
  await evaluate(`(() => { const el = document.querySelector('select[aria-label="Open saved story"]'); el.value = ${JSON.stringify(story.id)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await wait(`document.querySelector('.story-sentences').dataset.artifactId === ${JSON.stringify(story.id)}`);

  replace('inflow:openArtifact', (event, ...args) => new Promise(resolve => navigation.push(() => resolve(handlers.get('inflow:openArtifact')(event, ...args)))));
  await clickText('.workspace-topnav button', 'Library');
  await wait('document.querySelector(".workspace-library-dialog").open');
  await clickText('.workspace-library-item', 'STORY' + secondStory.title + '1 words · 2 sentences');
  while (!navigation.length) await delay(60);
  await select('.artifact-korean', '갔어요'); await fill('meaningZh', '保留来源跳转草稿'); navigation.shift()();
  await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
  assert.equal(await evaluate('document.querySelector(".story-sentences").dataset.artifactId'), story.id);
  await clickText('.vocabulary-selection button', 'Discard');
  replace('inflow:openArtifact', handlers.get('inflow:openArtifact'));

  replace('inflow:listVocabulary', event => new Promise(resolve => navigation.push(() => resolve(handlers.get('inflow:listVocabulary')(event)))));
  await clickText('.story-options button', 'Generate a story');
  while (!navigation.length) await delay(60);
  await select('.artifact-korean', '갔어요'); await fill('meaningZh', '保留生成前草稿'); navigation.shift()();
  await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
  assert.equal(await evaluate('!!document.querySelector(".workspace-target-dialog")'), false);
  await clickText('.vocabulary-selection button', 'Discard');
  replace('inflow:listVocabulary', handlers.get('inflow:listVocabulary'));
  console.log('PASS: delayed Story opening, source navigation and target dialog preserve edited drafts; unedited drafts close');

  await select('.artifact-korean', '갔어요');
  await wait('document.querySelector(".vocabulary-selection input[name=lemma]")?.value === "가다"');
  await fill('meaningZh', '去'); await click('.vocabulary-selection button[type=submit]');
  await wait('!document.querySelector(".vocabulary-selection")');
  const merged = await evaluate('window.inflow.listVocabulary().then(entries => entries.find(entry => entry.lemma === "가다"))');
  assert.equal(merged.id, go.id); assert.equal(merged.contexts.length, 2);
  assert.equal(merged.contexts[1].source.artifactId, story.id);
  await click('.story-reader-footer button[aria-label="Show Chinese translation"]');
  assert.ok(await evaluate('document.querySelector(".story-translation").textContent.includes("学校")'));
  await clickText('.workspace-topnav button', 'Vocab');
  await wait('!document.querySelector(".workspace-vocab").hidden && [...document.querySelectorAll(".vocab-row")].some(el => el.textContent.includes("가다"))');
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(path.join(output, 'vocabulary.png'), (await window.webContents.capturePage()).toPNG());
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, mediaId: media.id, artifactId: story.id, goId: go.id, contexts: merged.contexts.length }, null, 2));
  console.log(`PASS: Story collection, sense deduplication, translation and notebook refresh\nEvidence: ${output}`);
  app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
