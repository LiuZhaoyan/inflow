/* eslint @typescript-eslint/no-require-imports: off -- Isolated Electron visual acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

async function run() {
  if (!process.versions.electron) {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = require('node:child_process').spawn(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true });
    return new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Visual acceptance exited ${code}`))); });
  }
  const { app, BrowserWindow, ipcMain, protocol } = require('electron');
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  const output = process.env.INFLOW_VISUAL_OUTPUT || path.join(root, '.scratch/desktop-learning/generated-samples/frontend-polish');
  require('node:fs').mkdirSync(output, { recursive: true });
  app.setPath('userData', path.join(output, 'profile'));
  const sentences = ['아침에 도서관으로 걸어갔어요.', '창가에 앉아서 새로운 책을 읽었어요.', '조용한 시간 덕분에 마음이 편안해졌어요.'];
  const segments = sentences.map((text, i) => ({ id: `s${i}`, start: i * 10, end: i * 10 + 9, text, groups: text.split(' ') }));
  const media = { id: 'sample', name: '도서관에서 보내는 아침 · A morning at the library', language: 'ko', video: false, missing: false, segments,
    learning: { position: 0, index: 0, duration: 30, mode: 'sentence', rate: 1, loop: true } };
  const vocabulary = [['도서관', '图书馆'], ['창가', '窗边'], ['조용하다', '安静'], ['마음', '心情']].map(([lemma, meaningZh], i) => ({ id: `v${i}`, language: 'ko', lemma, meaningZh, selected: true,
    contexts: [{ id: `c${i}`, surface: lemma, sentence: sentences[i % 3], source: { type: 'media', mediaId: media.id, segmentId: segments[i % 3].id, start: i * 10, name: media.name } }] }));
  const story = { id: 'story', language: 'ko', title: '조용한 아침의 작은 발견', createdAt: '2026-10-19T01:00:00Z', elapsedMs: 1200, requestedModel: 'deepseek-flash', targets: vocabulary.map(({ id, lemma, meaningZh }) => ({ id, lemma, meaningZh })),
    sentences: sentences.map((text, i) => {
      const surface = ['도서관', '창가', '조용한'][i], start = text.indexOf(surface);
      return { parts: [{ text: text.slice(0, start), targetId: null }, { text: surface, targetId: vocabulary[i].id }, { text: text.slice(start + surface.length), targetId: null }], translationZh: ['早上，我步行去了图书馆。', '我坐在窗边，读起了一本新书。', '安静的时光让我的心情平静了下来。'][i] };
    }) };
  let locale = 'zh-CN', scenario = 'empty', failProcessing = false;
  const settings = () => ({ interfaceLocale: locale, videoMaskColor: '#000000' });
  const currentMedia = () => scenario === 'unprocessed' ? { ...media, segments: [] } : media;
  const methods = {
    getSettings: settings, saveSettings: (_event, value) => { locale = value.interfaceLocale || locale; return settings(); },
    restore: () => scenario === 'empty' ? null : currentMedia(),
    list: () => [media], open: currentMedia, readMedia: currentMedia, listVocabulary: () => vocabulary, listArtifactVocabulary: () => [],
    selectVocabulary: (_event, ids) => {
      for (const entry of vocabulary) entry.selected = ids.includes(entry.id);
      return ids;
    },
    listArtifacts: () => [story], restoreArtifact: () => story, openArtifact: () => story,
    credentialStatus: () => ({ configured: true }), modelStatus: () => ({ whisper: true, englishParser: true, translate: { 'ko-en': true, 'en-zh': true } }),
    saveLearning: () => null, cancel: () => null, chooseImportMedia: () => 'sample-ticket', importMedia: () => { scenario = 'unprocessed'; return currentMedia(); },
    transcribe: async () => { await new Promise(resolve => setTimeout(resolve, 400)); if (failProcessing) throw new Error('Processing fixture failed'); scenario = 'ready'; return currentMedia(); },
    translate: () => '早上，我步行去了图书馆。',
  };
  for (const [method, handler] of Object.entries(methods)) ipcMain.handle(`inflow:${method}`, handler);
  ipcMain.on('inflow:acceptArtifact', event => { event.returnValue = { artifact: story }; });
  ipcMain.on('inflow:acceptMedia', event => { event.returnValue = { media: currentMedia() }; });
  await app.whenReady();
  const wav = Buffer.alloc(44 + 8000 * 30 * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  protocol.handle('inflow', request => {
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.get('range') || '');
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return new Response(wav.subarray(start, end + 1), { status: range ? 206 : 200, headers: {
      'Content-Type': 'audio/wav', 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes',
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
    } });
  });
  const window = new BrowserWindow({ width: 1200, height: 800, useContentSize: true, show: false,
    webPreferences: { preload: path.join(root, 'desktop/preload.cjs'), backgroundThrottling: false, offscreen: true } });
  window.webContents.on('console-message', event => { if (event.level === 'error') console.log('Renderer:', event.message); });
  const evaluate = async code => { try { return await window.webContents.executeJavaScript(code, true); } catch (error) { console.error('Evaluation failed:', code); throw error; } };
  const settle = () => new Promise(resolve => setTimeout(resolve, 160));
  const wait = async code => { for (let i = 0; i < 150; i++) { if (await evaluate(code)) return; await settle(); } console.log(await evaluate(`({text:document.body.innerText,media:[...document.querySelectorAll('audio,video')].map(e=>({src:e.src,error:e.error?.message,ready:e.readyState,duration:e.duration}))})`)); throw new Error(`Timed out: ${code}`); };
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await settle(); };
  const capture = async name => { await settle(); const image = await window.webContents.capturePage(); await fs.writeFile(path.join(output, `${name}.png`), image.toPNG()); };
  const load = async () => { await window.loadURL(process.env.INFLOW_CONTENT_URL || 'http://127.0.0.1:3000'); await wait(`document.documentElement.lang === ${JSON.stringify(locale)} && document.querySelectorAll('.vocab-row').length === 4`); await settle(); };
  const check = async name => {
    const dimensions = await evaluate(`({ width:innerWidth, height:innerHeight, pageWidth:document.documentElement.scrollWidth, pageHeight:document.documentElement.scrollHeight })`);
    assert.ok(dimensions.pageWidth <= dimensions.width, `${name}: horizontal overflow ${JSON.stringify(dimensions)}`);
    assert.ok(dimensions.pageHeight <= dimensions.height, `${name}: vertical page overflow ${JSON.stringify(dimensions)}`);
  };
  try {
    for (locale of ['zh-CN', 'en']) {
      for (const [width, height] of [[1200, 800], [1440, 900], [900, 650]]) {
        window.setContentSize(width, height);
        const suffix = `${locale}-${width}x${height}`;
        scenario = 'empty'; await load(); await check('empty');
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('.workspace-sentence-area')).display`), 'none');
        await capture(`empty-${suffix}`);
        scenario = 'ready'; await load(); await wait(`!document.querySelector('.workspace-play-button').disabled`); await check('listen');
        assert.ok(await evaluate(`(() => {const r=document.querySelector('.workspace-player-toolbar').getBoundingClientRect();return r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;})()`));
        assert.ok(await evaluate(`document.querySelector('.workspace-sentence-copy').clientHeight >= 80`), 'Reserve readable space for the current sentence');
        assert.ok(await evaluate(`[...document.querySelectorAll('.workspace-player-toolbar button,.workspace-player-toolbar summary')].every(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth && r.bottom<=innerHeight;})`), 'All playback actions remain visible');
        await click('.workspace-mask-toggle');
        await click('.workspace-mask-group');
        assert.equal(await evaluate(`document.querySelector('.workspace-mask-group').getAttribute('aria-pressed')`), 'true');
        await click('.workspace-mask-toggle'); await capture(`listen-${suffix}`);
        await click('.workspace-topnav nav button:nth-child(3)'); await check('vocab'); await capture(`vocab-${suffix}`);
        await click('.workspace-topnav nav button:first-child');
        await click('.workspace-library-entry:last-child .workspace-library-item');
        await wait(`!document.querySelector('.workspace-story').hidden`); await check('story'); await capture(`story-${suffix}`);
        await click('.story-dropdown summary'); await capture(`story-menu-${suffix}`); await click('.story-dropdown summary');
        await click('.workspace-settings-nav button'); await wait(`document.querySelector('.workspace-settings-dialog')?.open`); await capture(`settings-${suffix}`);
        await click('.workspace-settings-dialog header button');
        await click('.workspace-topnav nav button:nth-child(3)');
        await click('.vocab-heading-actions .workspace-button--primary');
        await wait(`document.querySelector('.workspace-target-dialog')?.open`);
        await click('.workspace-target-dialog footer .workspace-button--primary');
        await wait(`document.querySelector('.story-generation-dialog')?.open`);
        await capture(`generation-${suffix}`);
        await click('.story-dialog-heading button');
        console.log(`PASS layouts and mask interaction ${suffix}`);
      }
    }
    locale = 'en'; scenario = 'unprocessed'; window.setContentSize(1200, 800); await load();
    await wait(`!document.querySelector('.workspace-status button').disabled`);
    assert.equal(await evaluate(`document.querySelector('.workspace-status button').textContent`), 'Start processing');
    failProcessing = true; await click('.workspace-status button');
    await wait(`document.querySelector('.workspace-status button').textContent === 'Retry processing'`);
    await capture('processing-error-en-1200x800');
    failProcessing = false; await click('.workspace-status button');
    await wait(`document.querySelector('.workspace-status button').textContent === 'Process again'`);
    assert.equal(await evaluate(`document.querySelectorAll('.workspace-context-row').length`), 6);
    scenario = 'empty'; await load(); await click('.workspace-stage-empty button'); await click('.workspace-source-language-option[lang="ko"]');
    await wait(`document.querySelector('.workspace-status button')?.textContent === 'Process again'`);
    console.log('PASS first import, automatic processing, failure and retry');
    console.log(`Screenshots: ${output}`);
  } catch (error) { await capture('failure'); throw error; } finally { window.destroy(); app.quit(); }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
