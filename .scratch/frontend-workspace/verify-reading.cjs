// Isolated native Electron acceptance run for the Reading workspace.
/* eslint @typescript-eslint/no-require-imports: off -- Electron's native bootstrap must load CommonJS desktop bundles. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const fixture = 'C:/Users/123/.codex/visualizations/2026/10/01/01a0f70e-ef84-7420-8768-a29d34b9c4c3/playback-smoke.mp4';

const segments = [
  { start: 0, end: 2, text: '비가 내리는 저녁이었어요.', groups: ['비가 내리는 저녁이었어요.'] },
  { start: 2, end: 4, text: '친구와 함께 작은 거리를 걸었어요.', groups: ['친구와 함께 작은 거리를 걸었어요.'] },
  { start: 4, end: 6, text: '비가 그치고 따뜻한 카페에서 커피를 마셨어요.', groups: ['비가 그치고 따뜻한 카페에서 커피를 마셨어요.'] },
  { start: 6, end: 8, text: '마지막에는 그대로 집으로 돌아왔어요.', groups: ['마지막에는 그대로 집으로 돌아왔어요.'] },
];

function passage(input) {
  return {
    title: input.topic?.trim() || 'A Rainy Evening',
    sentences: input.targets.map(target => ({
      parts: [
        { text: '비가 오래 내리던 저녁, ', targetId: null },
        { text: target.lemma, targetId: target.id },
        { text: '를 생각하며 조용히 골목을 걸었어요. 창문마다 켜진 작은 불빛과 따뜻한 커피 향이 빗소리 속에서 번졌고, 나는 우산을 접은 채 천천히 집으로 돌아갈 길을 떠올렸어요.', targetId: null },
      ],
      translationZh: `雨声中的夜晚，我想起了「${target.meaningZh}」，慢慢走过巷子。`,
    })),
  };
}

async function run() {
  if (!process.versions.electron) {
    const source = path.resolve(process.argv[2] || fixture);
    assert.equal(path.extname(source).toLowerCase(), '.mp4', 'Provide an 8-second MP4 fixture.');
    await fs.access(source);
    const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/reading-acceptance-'));
    await fs.copyFile(source, path.join(output, 'Queen of Tears.mp4'));
    const env = { ...process.env, DEEPSEEK_API_KEY: '' };
    delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve, reject) => {
      const child = spawn(require('electron'), [__filename, 'electron', output], { stdio: 'inherit', env });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Electron acceptance exited ${code}`)));
    });
    console.log(`Native UI evidence: ${output}`);
    return;
  }

  const { app, BrowserWindow, dialog, protocol } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  const outputArg = process.argv[3];
  const output = path.resolve(outputArg || '.');
  const scratchRoot = path.resolve(root, '.scratch/desktop-learning/generated-samples');
  const relativeOutput = path.relative(scratchRoot, output);
  if (!outputArg || relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) throw new Error('Electron profile must stay under the isolated generated-samples scratch directory.');
  const profile = path.resolve(output, 'profile');
  const sample = path.join(output, 'Queen of Tears.mp4');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.setPath('userData', profile);

  const { DesktopOperations } = require(path.join(root, 'build/desktop/desktop/operations.js'));
  const processor = async mode => mode === 'probe' ? { duration: 8 } : mode === 'transcribe' ? { segments } : { translation: 'native fixture translation' };
  const generator = async input => ({ ...passage(input), requestedModel: 'native-fixture', responseId: 'native-fixture-response' });
  const ops = new DesktopOperations(profile, processor, generator);
  const imported = await ops.importMedia(sample);
  const media = await ops.transcribe(imported.id, 'seed-transcription');
  await ops.open(media.id);

  const mediaWords = [
    ['비', 'rain', 0, '비가'], ['저녁', 'evening', 0, '저녁'], ['친구', 'friend', 1, '친구와'],
    ['거리', 'street', 1, '거리를'], ['따뜻하다', 'warm', 2, '따뜻한'], ['카페', 'cafe', 2, '카페'],
    ['그대로', 'as it is', 3, '그대로'], ['돌아오다', 'to return', 3, '돌아왔어요'],
  ];
  const addMedia = (lemma, meaningZh, segmentIndex, surface) => ops.saveVocabulary({
    lemma, meaningZh,
    context: { surface, sentence: media.segments[segmentIndex].text,
      source: { type: 'media', mediaId: media.id, segmentId: media.segments[segmentIndex].id, name: media.name, start: media.segments[segmentIndex].start } },
  });
  const targets = [];
  for (const [lemma, meaningZh, index, surface] of mediaWords) targets.push(await addMedia(lemma, meaningZh, index, surface));
  await ops.saveVocabulary({ id: targets[0].id, lemma: targets[0].lemma, meaningZh: targets[0].meaningZh,
    context: { surface: '비가', sentence: media.segments[2].text, source: { type: 'media', mediaId: media.id, segmentId: media.segments[2].id, name: media.name, start: 4 } } });
  for (let index = 0; index < 8; index++) {
    const entry = media.segments[index % media.segments.length];
    const surface = ['비가', '친구와', '커피를', '그대로'][index % 4];
    await addMedia(`연습${String(index + 1).padStart(2, '0')}`, `practice ${index + 1}`, entry.ordinal ?? index % 4, surface);
  }
  const manual = [];
  for (const [lemma, meaningZh] of [['기분', 'mood'], ['바람', 'wind']]) manual.push(await ops.saveVocabulary({ lemma, meaningZh }));

  await ops.selectVocabulary(targets.map(entry => entry.id));
  const rainy = await ops.generateArtifact(targets.map(entry => entry.id), 'A Rainy Evening', 'seed-rainy-story', 'native-test-only');
  const quiet = await ops.generateArtifact([manual[0].id], 'Quiet Cafe', 'seed-quiet-story', 'native-test-only');
  const storySurfaces = ['골목', '창문', '불빛', '커피', '빗소리', '우산'];
  for (const lemma of storySurfaces) await ops.saveVocabulary({ lemma, meaningZh: 'story context', context: {
    surface: lemma, sentence: rainy.sentences[0].parts.map(part => part.text).join(''),
    source: { type: 'artifact', artifactId: rainy.id, sentenceIndex: 0, name: rainy.title },
  } });
  await ops.selectVocabulary([]);
  await ops.openArtifact(rainy.id);
  const seeded = { mediaId: media.id, mediaPath: ops.mediaPath(media.id), rainyId: rainy.id, quietId: quiet.id,
    targetIds: targets.map(entry => entry.id), vocabulary: ops.listVocabulary() };
  ops.close();
  await fs.writeFile(path.join(output, 'seed.json'), JSON.stringify({ mediaId: seeded.mediaId, rainyId: seeded.rainyId, quietId: seeded.quietId, entries: seeded.vocabulary.length }));

  // Main-process requests are confined to the deterministic provider response below.
  process.env.DEEPSEEK_API_KEY = 'native-acceptance-only';
  let providerCalls = 0;
  global.fetch = async (url, init) => {
    if (String(url) !== 'https://api.deepseek.com/responses') throw new Error('Unexpected network request in native acceptance run.');
    providerCalls++;
    const request = JSON.parse(init.body);
    const input = JSON.parse(request.input);
    return new Response(JSON.stringify({
      id: `native-response-${providerCalls}`, status: 'completed',
      output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(passage(input)) }] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sample] });
  const consoleErrors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide();
    window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') consoleErrors.push(event.message); });
  });
  const registerSchemes = protocol.registerSchemesAsPrivileged;
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(root, 'build/desktop/desktop/main.js'));
  protocol.registerSchemesAsPrivileged = registerSchemes;
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  assert.ok(window);
  window.webContents.setZoomFactor(1);
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code, timeout = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeout) { if (await evaluate(code)) return; await delay(150); }
    throw new Error(`Timed out waiting for ${code}`);
  }
  async function click(selector) {
    const found = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    assert.ok(found, `Missing click target: ${selector}`);
    await delay(50);
  }
  async function clickText(label) {
    const found = await evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(button => button.getClientRects().length && (button.textContent.trim() === ${JSON.stringify(label)} || button.getAttribute('aria-label') === ${JSON.stringify(label)})); if (!el) return false; el.click(); return true; })()`);
    assert.ok(found, `Missing button: ${label}`);
    await delay(50);
  }
  async function setValue(selector, value) {
    const found = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); return true; })()`);
    assert.ok(found, `Missing input: ${selector}`);
    await delay(50);
  }
  async function clickLemma(lemma) {
    const found = await evaluate(`(() => { const row = [...document.querySelectorAll('.vocab-row')].find(el => el.querySelector('.vocab-row-word')?.textContent.trim() === ${JSON.stringify(lemma)}); if (!row) return false; row.click(); return true; })()`);
    assert.ok(found, `Missing vocabulary row: ${lemma}`);
    await delay(50);
  }
  async function capture(name) {
    window.show();
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await delay(250);
    const image = await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true });
    await fs.writeFile(path.join(output, name), image.toPNG());
    window.hide();
  }
  async function assertNoHorizontalOverflow() {
    const state = await evaluate(`({client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth, body:document.body.scrollWidth})`);
    assert.ok(state.scroll <= state.client + 1 && state.body <= state.client + 1, JSON.stringify(state));
    return state;
  }

  try {
    window.setContentSize(1536, 1024);
    await wait('!!window.inflow && !!document.querySelector(".workspace-topnav") && !!document.querySelector("video")');
    await wait('document.querySelector(".workspace-video-stage video")?.readyState >= 1');
    const header = await evaluate(`(() => {
      const element = document.querySelector('.workspace-topnav');
      const nav = element.querySelector('nav');
      const safe = navigator.windowControlsOverlay.getTitlebarAreaRect();
      return { visible: navigator.windowControlsOverlay.visible, top: element.getBoundingClientRect().top,
        height: element.getBoundingClientRect().height, drag: getComputedStyle(element).getPropertyValue('-webkit-app-region'),
        navDrag: getComputedStyle(nav).getPropertyValue('-webkit-app-region'), navRight: nav.getBoundingClientRect().right,
        safeRight: safe.x + safe.width, safeHeight: safe.height };
    })()`);
    assert.equal(header.visible, true); assert.equal(header.top, 0); assert.equal(header.height, 48);
    assert.equal(header.drag, 'drag'); assert.equal(header.navDrag, 'no-drag');
    assert.ok(header.navRight <= header.safeRight && header.safeHeight <= header.height);
    window.show(); await delay(250);
    const nativeSources = await require('electron').desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 1600, height: 1100 } });
    const nativeWindow = nativeSources.find(source => source.id === window.getMediaSourceId());
    assert.ok(nativeWindow && !nativeWindow.thumbnail.isEmpty());
    await fs.writeFile(path.join(output, 'custom-header-native.png'), nativeWindow.thumbnail.toPNG());
    window.maximize(); await delay(150); assert.equal(window.isMaximized(), true);
    window.unmaximize(); await delay(150); assert.equal(window.isMaximized(), false);
    window.minimize(); await delay(150); assert.equal(window.isMinimized(), true);
    window.restore(); await delay(150); assert.equal(window.isMinimized(), false); window.hide();
    await clickText('Vocab');
    await wait('!document.querySelector(".workspace-vocab").hidden && document.querySelector(".workspace-topnav button[aria-current=page]")?.textContent === "Vocab"');
    await wait('document.querySelectorAll(".vocab-row").length === 24');
    const counts = await evaluate(`Object.fromEntries([...document.querySelectorAll('.vocab-filters button')].map(button => [button.firstChild.textContent.trim().toLowerCase(), button.querySelector('span')?.textContent.trim()]))`);
    assert.equal(counts.all, '24'); assert.equal(counts.media, '16'); assert.equal(counts.stories, '6'); assert.equal(counts.manual, '2');
    await clickLemma('비');
    await capture('vocabulary-1536.png');

    await setValue('.vocab-search input', 'no-such-word');
    await wait('document.querySelectorAll(".vocab-row").length === 0');
    assert.ok(await evaluate('!!document.querySelector(".vocab-empty")'));
    await setValue('.vocab-search input', '');
    await wait('document.querySelectorAll(".vocab-row").length === 24');
    await evaluate(`[...document.querySelectorAll('.vocab-filters button')].find(button => button.textContent.includes('Manual'))?.click()`);
    await wait('document.querySelectorAll(".vocab-row").length === 2');
    await clickLemma('기분'); await click('.vocab-edit'); await wait('!!document.querySelector(".vocab-editor")');
    await setValue('.vocab-editor input[name="lemma"]', 'unsaved-draft');
    await clickText('Content'); await clickText('Vocab');
    await wait('document.querySelector(".vocab-editor input[name=lemma]")?.value === "unsaved-draft"');
    await clickText('Cancel');
    assert.equal((await evaluate('window.inflow.listVocabulary()')).find(entry => entry.meaningZh === 'mood').lemma, '기분');

    await click('.vocab-edit'); await setValue('.vocab-editor input[name="meaningZh"]', 'verified meaning');
    await clickText('Save vocabulary'); await wait('!document.querySelector(".vocab-editor")');
    assert.equal((await evaluate('window.inflow.listVocabulary()')).find(entry => entry.lemma === '기분').meaningZh, 'verified meaning');
    await click('.vocab-edit'); await setValue('.vocab-editor input[name="meaningZh"]', 'mood');
    await clickText('Save vocabulary'); await wait('!document.querySelector(".vocab-editor")');

    await evaluate(`[...document.querySelectorAll('.vocab-filters button')].find(button => button.textContent.includes('All'))?.click()`);
    await setValue('.vocab-search input', '');
    await wait('document.querySelectorAll(".vocab-row").length === 24');
    await clickLemma('거리');
    await click('.vocab-detail-panel .vocab-context-card .vocab-open-source');
    await wait('document.querySelector(".workspace-video-stage video")?.readyState >= 1 && document.querySelector(".workspace-video-stage video").currentTime >= 1.8');
    const mediaState = await evaluate(`({time:document.querySelector('.workspace-video-stage video').currentTime, paused:document.querySelector('.workspace-video-stage video').paused})`);
    assert.ok(mediaState.paused && Math.abs(mediaState.time - 2) < 0.3, JSON.stringify(mediaState));
    await clickText('Vocab');
    const preservedMedia = await evaluate(`({time:document.querySelector('.workspace-video-stage video').currentTime, paused:document.querySelector('.workspace-video-stage video').paused})`);
    assert.ok(preservedMedia.paused && Math.abs(preservedMedia.time - mediaState.time) < 0.2, JSON.stringify(preservedMedia));

    await clickLemma('골목');
    await click('.vocab-detail-panel .vocab-context-card .vocab-open-source');
    await wait(`document.querySelector('article[data-artifact-id="${seeded.rainyId}"]') && document.querySelector('#artifact-sentence-0[aria-current="location"]')`);
    await capture('story-1536.png');
    await clickText('Next sentence');
    await wait('document.querySelector("#artifact-sentence-1[aria-current=location]")');
    await clickText('Previous sentence');
    await wait('document.querySelector("#artifact-sentence-0[aria-current=location]")');
    const storyScroll = await evaluate(`({reader:getComputedStyle(document.querySelector('.story-reading-pane')).overflowY, context:getComputedStyle(document.querySelector('.story-context-list')).overflowY, targets:getComputedStyle(document.querySelector('.story-vocabulary-list')).overflowY})`);
    assert.ok(['auto', 'scroll'].includes(storyScroll.reader) && ['auto', 'scroll'].includes(storyScroll.context) && ['auto', 'scroll'].includes(storyScroll.targets), JSON.stringify(storyScroll));

    await evaluate(`(() => { const mark=document.querySelector('#artifact-sentence-0 mark'); const range=document.createRange(); range.selectNodeContents(mark.firstChild); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range); })()`);
    await wait('!!document.querySelector(".story-selection-toolbar")');
    await clickText('＋ Collect'); await wait('!!document.querySelector(".vocab-editor")');
    assert.ok(await evaluate('document.querySelector(".vocab-editor-context")?.textContent.includes("A Rainy Evening")'));
    await clickText('Cancel');
    assert.equal((await evaluate('window.inflow.listVocabulary()')).length, 24);
    await clickText('Content');

    await clickText('Library'); await wait('!!document.querySelector(".workspace-library-dialog[open]")');
    await evaluate(`(() => [...document.querySelectorAll('.workspace-library-item')].find(button => button.textContent.includes('A Rainy Evening'))?.click())()`);
    await wait(`document.querySelector('article[data-artifact-id="${seeded.rainyId}"]')`);
    const artifactBefore = (await evaluate('window.inflow.listArtifacts()')).length;
    await clickText('Vocab'); await click('.vocab-generate');
    await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-target-list input:checked").length'), 0);
    await click('button[aria-label="Close vocabulary selection"]');
    await wait('!document.querySelector(".workspace-target-dialog")');
    assert.equal((await evaluate('window.inflow.listVocabulary()')).filter(entry => entry.selected).length, 0);

    await click('.vocab-generate'); await wait('!!document.querySelector(".workspace-target-dialog[open]")');
    const chosen = await evaluate(`(() => [...document.querySelectorAll('.workspace-target-list input')].slice(0,20).map(input => { input.click(); return input.closest('label').querySelector('strong').textContent.trim(); }))()`);
    assert.equal(chosen.length, 20);
    await wait('document.querySelectorAll(".workspace-target-list input:checked").length === 20');
    assert.ok(await evaluate('document.querySelectorAll(".workspace-target-list input")[20].disabled'));
    await clickText('Continue'); await wait('!!document.querySelector(".story-generation-dialog[open]")');
    const selectedIds = (await evaluate('window.inflow.listVocabulary()')).filter(entry => entry.selected).map(entry => entry.lemma).sort();
    assert.deepEqual(selectedIds, [...chosen].sort());
    await setValue('.story-generation-dialog input[name="topic"]', 'Native Acceptance Story');
    await clickText('Generate story');
    await wait('document.querySelector(".story-hero h1")?.textContent === "Native Acceptance Story"');
    const afterGeneration = await evaluate('window.inflow.listArtifacts()');
    assert.equal(afterGeneration.length, artifactBefore + 1);
    assert.deepEqual(afterGeneration[0].targets.map(target => target.lemma).sort(), [...chosen].sort());
    assert.equal(providerCalls, 1);

    await evaluate(`(() => { const range=document.createRange(); range.selectNodeContents(document.querySelector('#artifact-sentence-0 mark').firstChild); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range); })()`);
    await wait('!!document.querySelector(".story-selection-toolbar")'); await clickText('Translate');
    await wait('!!document.querySelector(".story-translation")');
    assert.equal(providerCalls, 1, 'stored translations must not make provider calls');
    await evaluate(`(() => { const details=document.querySelector('.story-options'); details.open=true; const select=details.querySelector('select[aria-label="Open saved story"]'); select.value=${JSON.stringify(seeded.quietId)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(`document.querySelector('article[data-artifact-id="${seeded.quietId}"]')`);

    await evaluate(`(() => { const details=document.querySelector('.story-options'); details.open=true; const select=details.querySelector('select[aria-label="Open saved story"]'); select.value=${JSON.stringify(seeded.rainyId)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(`document.querySelector('article[data-artifact-id="${seeded.rainyId}"]')`);
    await evaluate('window.getSelection()?.removeAllRanges(); document.querySelector(".story-reading-pane").scrollTop = 0');

    window.setContentSize(1536, 1024);
    await clickText('Vocab'); await clickLemma('그대로');
    await evaluate('document.querySelector(".vocab-row[aria-pressed=true]").scrollIntoView({block:"center"})');
    await delay(400);
    const vocabLayout = await evaluate(`(() => { const root=document.querySelector('.vocab-workspace').getBoundingClientRect(), left=document.querySelector('.vocab-list-panel').getBoundingClientRect(), right=document.querySelector('.vocab-detail-panel').getBoundingClientRect(); return {root:root.width,left:left.width,right:right.width,gap:right.left-left.right,nav:document.querySelector('.workspace-topnav').getBoundingClientRect().height,rows:getComputedStyle(document.querySelector('.vocab-rows')).overflowY,detail:getComputedStyle(document.querySelector('.vocab-detail-panel')).overflowY}; })()`);
    assert.ok(vocabLayout.left / vocabLayout.root > 0.52 && vocabLayout.left / vocabLayout.root < 0.68 && vocabLayout.gap > 0, JSON.stringify(vocabLayout));
    assert.ok(['auto', 'scroll'].includes(vocabLayout.rows) && ['auto', 'scroll'].includes(vocabLayout.detail), JSON.stringify(vocabLayout));
    const wideOverflow = await assertNoHorizontalOverflow(); await capture('vocabulary-1536.png');
    await clickText('Content');
    const storyLayout = await evaluate(`(() => { const root=document.querySelector('.story-layout').getBoundingClientRect(), left=document.querySelector('.story-reader-panel').getBoundingClientRect(), right=document.querySelector('.story-sidebar').getBoundingClientRect(); return {root:root.width,left:left.width,right:right.width,gap:right.left-left.right}; })()`);
    assert.ok(storyLayout.left / storyLayout.root > 0.65 && storyLayout.left / storyLayout.root < 0.78 && storyLayout.gap > 0, JSON.stringify(storyLayout));
    const storyWideOverflow = await assertNoHorizontalOverflow(); await capture('story-1536.png');

    window.setContentSize(1100, 800); await delay(250);
    await clickText('Vocab'); const vocabNarrow = await assertNoHorizontalOverflow(); await capture('vocabulary-1100.png');
    await clickText('Content'); const storyNarrow = await assertNoHorizontalOverflow(); await capture('story-1100.png');
    const evidence = { header, mediaState, preservedMedia, counts, storyScroll, vocabLayout, storyLayout, wideOverflow, storyWideOverflow, vocabNarrow, storyNarrow,
      generatedTargets: afterGeneration[0].targets.map(target => target.lemma), providerCalls, artifacts: afterGeneration.map(item => item.title), consoleErrors };
    assert.deepEqual(consoleErrors, []);
    await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
    console.log(`Verified isolated native reading UI. Evidence: ${output}`);
  } finally { app.quit(); }
}

run().catch(error => {
  console.error(error);
  if (process.versions.electron) require('electron').app.exit(1);
  else process.exitCode = 1;
});
