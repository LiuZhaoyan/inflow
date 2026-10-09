// Verification driver loaded INSIDE the packaged Inflow app via the INFLOW_DESKTOP_DRIVER
// seam in desktop/main.ts. Configured through INFLOW_VERIFY_* environment variables; never
// used at normal runtime. Writes phase evidence (JSON + screenshots) to INFLOW_VERIFY_OUT.
const { app, dialog, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const PHASE = process.env.INFLOW_VERIFY_PHASE || '';
const OUT = process.env.INFLOW_VERIFY_OUT || '';
const MEDIA = process.env.INFLOW_VERIFY_MEDIA || '';
const PROFILE = process.env.INFLOW_VERIFY_PROFILE || '';
const CREDENTIAL = process.env.INFLOW_VERIFY_CREDENTIAL || '';
// Configure the credential through the Settings dialog (the real user path); configuring via the
// bridge alone leaves the renderer's credential state stale and the generation submit disabled.
const configureKeyViaUI = async key => {
  let opened = false;
  for (let attempt = 0; attempt < 10 && !opened; attempt += 1) {
    await runArg(clickByText, 'Settings');
    try { await wait(window, `() => !!document.querySelector('dialog.workspace-settings-dialog')`, 'settings dialog', 3000); opened = true; }
    catch { await new Promise(resolve => setTimeout(resolve, 1500)); }
  }
  if (!opened) throw new Error('settings dialog never opened (app still initializing)');
  await runArg(`value => { const input = document.querySelector('#settings-api-key'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); return true; }`, key);
  await runArg(`() => { const button = document.querySelector('dialog.workspace-settings-dialog button[type="submit"]'); if (!button) throw new Error('no settings save button'); button.click(); return true; }`);
  await wait(window, `() => !document.querySelector('dialog.workspace-settings-dialog')`, 'settings to close after successful save', 15000);
  const status = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.credentialStatus())`));
  return status.configured === true;
};
const EXTRA = process.env.INFLOW_VERIFY_EXTRA ? JSON.parse(process.env.INFLOW_VERIFY_EXTRA) : {};

const errors = [];
const consoleErrors = [];
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  if (!ok) throw new Error('Failed check: ' + name);
  return ok;
}

// Hermetic profile and scripted dialogs must be installed before the app's own start() runs.
app.setPath('userData', PROFILE);
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [MEDIA] });
dialog.showMessageBox = async () => ({ response: 0 });
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_e, level, message) => { if (level >= 3) consoleErrors.push(String(message)); });
});

function mainFacts() {
  const facts = {
    phase: PHASE,
    appIsPackaged: app.isPackaged,
    exe: process.execPath,
    userData: app.getPath('userData'),
    resourcesPath: process.resourcesPath || '',
    envWorker: process.env.INFLOW_WORKER || null,
    envModelsDir: process.env.INFLOW_MODELS_DIR || null,
    envPython: process.env.INFLOW_PYTHON || null,
    mediaPath: MEDIA,
    runtime: process.versions,
    windowsRelease: require('node:os').release(),
    cwd: process.cwd(),
    path: process.env.PATH,
  };
  if (facts.envWorker) facts.workerBinaryExists = fs.existsSync(facts.envWorker);
  const modelsDir = facts.envModelsDir;
  if (modelsDir && fs.existsSync(modelsDir)) facts.modelsDirListing = fs.readdirSync(modelsDir);
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = path.join(app.getPath('userData'), 'learning.sqlite');
    if (fs.existsSync(dbPath)) {
      facts.sqlitePath = dbPath;
      const db = new DatabaseSync(dbPath, { readOnly: true });
      facts.sqliteTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row => row.name);
      const count = table => { try { return Number(db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n); } catch { return -1; } };
      facts.sqliteCounts = { media: count('media'), segments: count('segments'), vocabulary: count('vocabulary'), artifacts: count('artifacts') };
      db.close();
    } else facts.sqlitePath = null;
  } catch (failure) { facts.sqliteError = String(failure); }
  return facts;
}

async function window_() {
  for (let i = 0; i < 50; i++) {
    const existing = BrowserWindow.getAllWindows()[0];
    if (existing) return existing;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return await new Promise(resolve => app.once('browser-window-created', (_e, w) => resolve(w)));
}

function evaluate(window, expression) {
  return window.webContents.executeJavaScript('(' + expression + ')()', true);
}
async function wait(window, expression, description, timeout = 30000) {
  const started = Date.now();
  for (;;) {
    let value = null;
    try { value = await evaluate(window, expression); } catch { value = null; }
    if (value) return value;
    if (Date.now() - started > timeout) {
      let diagnostic = '';
      try {
        diagnostic = await window.webContents.executeJavaScript(`JSON.stringify({
          buttons: [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Generate') || b.textContent.includes('Vocab') || b.textContent.includes('Generating')).map(b => ({ t: b.textContent.trim().slice(0, 40), d: b.disabled })),
          dialogs: [...document.querySelectorAll('dialog')].map(d => d.className + (d.open ? ':open' : ':closed')),
          storyNotice: document.querySelector('.story-notice')?.textContent || null,
          storySentences: document.querySelectorAll('.story-sentence').length,
          settingsSmalls: [...document.querySelectorAll('dialog.workspace-settings-dialog small')].map(s => s.className + '=' + s.textContent),
          alert: document.querySelector('[role="alert"]')?.textContent || null,
        })`, true);
      } catch (e) { diagnostic = 'diagnostic failed: ' + e.message; }
      throw new Error('Timed out waiting for ' + description + ' | state: ' + diagnostic);
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
async function shot(window, name) {
  window.show();
  window.focus();
  window.webContents.invalidate();
  await new Promise(resolve => setTimeout(resolve, 500));
  for (let attempt = 0; attempt < 3; attempt++) {
    let timer;
    try {
      const image = await Promise.race([
        window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Screenshot timed out')), 10000); }),
      ]);
      fs.writeFileSync(path.join(OUT, name), image.toPNG());
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally { clearTimeout(timer); }
  }
}
const run = expression => evaluate(window, expression);
const runArg = (expression, value) => window.webContents.executeJavaScript('(' + expression + ')(' + JSON.stringify(value) + ')', true);

let window;
let phaseResult = {};

const clickByText = `text => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text); if (!button) throw new Error('no button ' + text); button.click(); return true; }`;
// The story generation dialog stays mounted (hidden) in the DOM, so a text-based 'Cancel'
// search matches its button first; close settings through its unique header control instead.
const closeSettings = `() => { const button = document.querySelector('button[aria-label="Close settings"]'); if (!button) throw new Error('no Close settings button'); button.click(); return true; }`;
const clickAria = `label => { const button = document.querySelector('button[aria-label="' + label + '"]'); if (!button) throw new Error('no button ' + label); button.click(); return true; }`;
const sentences = `() => [...document.querySelectorAll('[aria-label="Sentence list"] button')].length`;
const busy = `() => !!document.querySelector('.workspace-status [role="status"]')`;
const idleRetry = `() => [...document.querySelectorAll('button')].some(b => b.textContent === '开始处理 / 重试')`;
const selectedRowIndex = `() => [...document.querySelectorAll('[aria-label="Sentence list"] button')].findIndex(b => b.getAttribute('aria-current') === 'true')`;
const videoInfo = `() => { const video = document.querySelector('video'); return video ? { src: video.src.slice(0, 40), duration: video.duration, currentTime: video.currentTime, paused: video.paused, rate: video.playbackRate } : null; }`;

async function waitForBridge() {
  await wait(window, `() => !!window.inflow`, 'renderer bridge');
}

// Select the first Korean word inside the given element and return the surface text.
const selectKoreanWord = `selector => {
  let node = null, match, current;
  for (const element of document.querySelectorAll(selector)) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while ((current = walker.nextNode())) {
      if (selector === '.artifact-korean' && current.parentElement.closest('mark')) continue;
      match = current.textContent.match(/[가-힣]{2,}/);
      if (match) { node = current; break; }
    }
    if (node) break;
  }
  if (!node) throw new Error('no text node');
  const selection = window.getSelection(); selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
  selection.addRange(range);
  return match[0];
}`;
const popupField = name => `name => { const input = document.querySelector('.vocabulary-selection input[name="${name}"]'); return input ? input.value : null; }`;
const popupBusy = `() => { const popup = document.querySelector('.vocabulary-selection'); if (!popup) return null; return !!popup.querySelector('p[role="status"]'); }`;

async function collectWordFrom(selector) {
  // The popup's selection listeners only attach when the workspace is idle (active prop requires
  // !busy); a selection made while busy never triggers a capture, so wait for idle and re-select
  // if the popup does not appear.
  await wait(window, `() => !document.querySelector('.workspace-status [role="status"]')`, 'workspace idle before selection', 60000);
  let surface = await runArg(selectKoreanWord, selector);
  for (let attempt = 0; attempt < 5 && !surface; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    surface = await runArg(selectKoreanWord, selector);
  }
  check('selection captured a word', !!surface, surface);
  const popupVisible = `() => !!document.querySelector('.vocabulary-selection[role="dialog"]')`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try { await wait(window, popupVisible, 'word popup', 3000); break; }
    catch { await runArg(selectKoreanWord, selector); if (attempt === 4) await wait(window, popupVisible, 'word popup', 15000); }
  }
  await wait(window, `() => { const popup = document.querySelector('.vocabulary-selection'); return popup && !popup.querySelector('p[role="status"]'); }`, 'offline dictionary lookup to finish', 60000);
  const lemma = await evaluate(window, popupField('lemma'));
  check('offline lemma resolved', !!lemma, lemma + ' (surface ' + surface + ')');
  await runArg(clickByText, 'Get contextual meaning · LLM');
  const meaningAppeared = await wait(window, `() => {
    const popup = document.querySelector('.vocabulary-selection'); if (!popup) return false;
    if (popup.querySelector('p[role="status"]')) return false;
    const error = popup.querySelector('[role="alert"]');
    if (error) return error.textContent;
    const suggestion = popup.querySelector('p[lang="zh"]');
    const meaning = popup.querySelector('input[name="meaningZh"]');
    return (suggestion && suggestion.textContent.includes('LLM suggestion:')) || (meaning && meaning.value.length > 0);
  }`, 'LLM meaning', 180000);
  const lookupError = await evaluate(window, `() => document.querySelector('.vocabulary-selection [role="alert"]')?.textContent || ''`);
  if (lookupError) throw new Error('Contextual lookup failed: ' + lookupError);
  if (await evaluate(window, `() => { const popup = document.querySelector('.vocabulary-selection'); return !!popup && !!popup.querySelector('p[lang="zh"]'); }`)) {
    await runArg(clickByText, 'Apply suggestion');
  }
  const meaning = await evaluate(window, popupField('meaningZh'));
  check('LLM contextual meaning applied', meaningAppeared && !!meaning, meaning);
  await runArg(clickByText, '+ Save vocabulary');
  await wait(window, `() => !document.querySelector('.vocabulary-selection[role="dialog"]')`, 'popup close after save', 20000);
  return { surface, lemma, meaning };
}

async function generateStory(topic, expectedTargets) {
  // The notebook's Generate story button stays disabled until its entry list loads; the artifact
  // library also has a 'Generate story' menu button, so target the notebook's .vocab-generate.
  await wait(window, `() => { const b = document.querySelector('.vocab-generate'); return b && !b.disabled; }`, 'Generate story button enabled', 20000);
  await runArg(`() => { document.querySelector('.vocab-generate').click(); return true; }`);
  await wait(window, `() => !!document.querySelector('dialog.workspace-target-dialog')`, 'target selection dialog', 20000);
  if (expectedTargets) {
    const checked = await runArg(`wanted => {
      const labels = [...document.querySelectorAll('dialog.workspace-target-dialog .workspace-target-list label')];
      let changed = false;
      for (const label of labels) {
        const box = label.querySelector('input[type="checkbox"]');
        if (!box) continue;
        const word = label.querySelector('.workspace-target-word strong')?.textContent || '';
        const want = wanted.includes(word);
        if (box.checked !== want) { box.click(); changed = true; }
      }
      return changed;
    }`, expectedTargets);
  }
  await runArg(clickByText, 'Continue');
  await wait(window, `() => document.querySelector('dialog.story-generation-dialog')?.open`, 'generation dialog', 20000);
  const topicInput = await evaluate(window, `() => { const input = document.querySelector('dialog.story-generation-dialog input[name="topic"]'); return !!input; }`);
  check('topic input present', topicInput);
  await runArg(`value => { const input = document.querySelector('dialog.story-generation-dialog input[name="topic"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); return true; }`, topic);
  // Submit through the generation dialog's own action button (the artifact library menu also
  // contains an enabled 'Generate story' button that a text search could match first).
  await wait(window, `() => [...document.querySelectorAll('dialog.story-generation-dialog footer button')].some(b => (b.textContent === 'Generate story' || b.textContent === 'Retry generation') && !b.disabled)`, 'generation submit enabled', 20000);
  const previousId = await evaluate(window, `() => document.querySelector('.story-sentences')?.dataset.artifactId || ''`);
  await runArg(`() => { const submit = [...document.querySelectorAll('dialog.story-generation-dialog footer button')].find(b => b.textContent === 'Generate story' || b.textContent === 'Retry generation'); if (!submit || submit.disabled) throw new Error('generation submit unavailable'); submit.click(); return true; }`);
  await wait(window, `() => document.querySelector('.story-notice[role="alert"]')?.textContent || (document.querySelector('.story-sentences')?.dataset.artifactId !== ${JSON.stringify(previousId)} && !!document.querySelector('.artifact-korean') && !document.querySelector('dialog.story-generation-dialog')?.open)`, 'new story or generation error', 240000);
  const error = await evaluate(window, `() => document.querySelector('.story-notice[role="alert"]')?.textContent || ''`);
  if (error) throw new Error('Generation failed: ' + error);
  await new Promise(resolve => setTimeout(resolve, 1500));
}

async function openLibraryKind(kind) {
  await runArg(clickByText, 'Library');
  await wait(window, `() => document.querySelector('dialog.workspace-library-dialog')?.open`, 'library open');
  await runArg(`kind => { const button = [...document.querySelectorAll('.workspace-library-item')].find(b => b.querySelector('.workspace-library-kind')?.textContent === kind); if (!button) throw new Error('no library item ' + kind); button.click(); }`, kind);
  await wait(window, `() => !document.querySelector('dialog.workspace-library-dialog')?.open`, 'library closes');
}

const phases = {
  async screenshots() {
    await waitForBridge();
    await wait(window, sentences, 'restored transcript');
    await wait(window, `() => document.querySelector('video')?.readyState >= 2`, 'restored video frame');
    await shot(window, '01-restored-listening.png');
    await openLibraryKind('STORY');
    check('story reader actually visible', await evaluate(window, `() => !!document.querySelector('.artifact-korean') && !document.querySelector('.workspace-story').hidden`));
    await shot(window, '02-restored-story.png');
    return { facts: mainFacts() };
  },
  async download() {
    await waitForBridge();
    const initial = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.modelStatus())`));
    check('translation models initially absent', !initial.translate['ko-en'] && !initial.translate['en-zh']);
    await runArg(clickByText, 'Settings');
    await wait(window, `() => !!document.querySelector('dialog.workspace-settings-dialog')`, 'settings');
    await runArg(clickByText, 'Processing models');
    await wait(window, `() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Download missing models')`, 'download action');
    await runArg(clickByText, 'Download missing models');
    await wait(window, `() => document.querySelector('#settings-models-panel [role="alert"]')?.textContent || document.querySelectorAll('#settings-models-panel [data-state="ready"]').length === 4`, 'model downloads through Settings', 300000);
    const error = await evaluate(window, `() => document.querySelector('#settings-models-panel [role="alert"]')?.textContent || ''`);
    if (error) throw new Error('Model download failed: ' + error);
    const status = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.modelStatus())`));
    check('both translation models downloaded by packaged worker', status.translate['ko-en'] && status.translate['en-zh']);
    await shot(window, '01-models-downloaded.png');
    return { facts: mainFacts(), initial, status };
  },
  async credential() {
    await waitForBridge();
    check('credential configured through Settings', await configureKeyViaUI(CREDENTIAL));
    return { facts: mainFacts() };
  },
  async models() {
    const facts = mainFacts();
    check('packaged app', facts.appIsPackaged);
    check('worker binary resolved from resources', facts.workerBinaryExists, facts.envWorker);
    check('models dir points at writable profile location', !!facts.envModelsDir && facts.envModelsDir.startsWith(facts.userData), facts.envModelsDir);
    check('dev python not referenced', !facts.envPython, facts.envPython);
    check('fresh profile has no models yet', !facts.modelsDirListing || facts.modelsDirListing.length === 0, JSON.stringify(facts.modelsDirListing || []));
    await waitForBridge();
    const status = await run(`async () => JSON.stringify(await window.inflow.modelStatus())`);
    const parsed = JSON.parse(status);
    check('first-use status reports everything missing', !parsed.whisper && !parsed.translate['ko-en'] && !parsed.translate['en-zh'] && !parsed.englishParser, status);
    await runArg(clickByText, 'Settings');
    await wait(window, `() => !!document.querySelector('dialog.workspace-settings-dialog')`, 'settings dialog');
    await runArg(clickByText, 'Processing models');
    await wait(window, `() => !!document.querySelector('#settings-models-panel')`, 'models panel');
    await new Promise(resolve => setTimeout(resolve, 800));
    const states = await evaluate(window, `() => [...document.querySelectorAll('#settings-models-panel [data-state]')].map(row => row.dataset.state)`);
    check('settings UI shows all model rows missing', states.length === 4 && states.every(state => state === 'missing'), states.join(','));
    await shot(window, '01-models-first-use-missing.png');
    const started = Date.now();
    const downloaded = await runArg(`async components => JSON.stringify(await window.inflow.setupModels(crypto.randomUUID(), components))`, ['english-parser']);
    const downloadMs = Date.now() - started;
    check('packaged worker downloads missing model', JSON.parse(downloaded).englishParser === true, downloaded);
    await runArg(closeSettings);
    await wait(window, `() => !document.querySelector('dialog.workspace-settings-dialog')`, 'settings dialog to close', 15000);
    await runArg(clickByText, 'Settings');
    await wait(window, `() => !!document.querySelector('dialog.workspace-settings-dialog')`, 'settings dialog to reopen', 15000);
    await runArg(clickByText, 'Processing models');
    await wait(window, `() => { const rows = [...document.querySelectorAll('#settings-models-panel [data-state]')]; return rows.length === 4 && rows.some(row => row.dataset.state === 'ready'); }`, 'english parser row ready', 30000);
    await new Promise(resolve => setTimeout(resolve, 500));
    await shot(window, '02-models-after-download.png');
    const englishParserDir = path.join(facts.userData, 'models', 'english-parser');
    check('downloaded model stored under profile, outside install resources', fs.existsSync(path.join(englishParserDir, 'en_core_web_sm', 'en_core_web_sm-3.8.0', 'config.cfg')), englishParserDir);
    return { facts, downloadMs, firstStatus: parsed };
  },

  async listen() {
    const facts = mainFacts();
    check('whisper model present in profile', fs.existsSync(path.join(facts.userData, 'models', 'whisper-turbo', 'model.bin')));
    await waitForBridge();
    await runArg(clickByText, '导入媒体');
    await wait(window, busy, 'processing to start', 60000);
    const processStarted = Date.now();
    const count = await wait(window, sentences, 'sentences after transcription', 600000);
    const processMs = Date.now() - processStarted;
    check('transcription produced sentences', count > 0, count + ' sentences in ' + processMs + 'ms');
    const info = await evaluate(window, videoInfo);
    check('media served from managed inflow:// url', info.src.startsWith('inflow://'), info.src);
    check('duration matches sample', Math.abs(info.duration - 155.775) < 1, String(info.duration));
    await runArg(clickAria, 'Next sentence');
    await runArg(clickAria, 'Next sentence');
    const rowIndex = await evaluate(window, selectedRowIndex);
    check('sentence selection seeks and updates list', rowIndex === 2, 'selected row ' + rowIndex);
    await runArg(clickByText, 'Sentence');
    await runArg(clickAria, 'Loop sentence');
    const loopOn = await evaluate(window, `() => !!document.querySelector('button[aria-label="Turn sentence loop off"]')`);
    check('sentence loop toggles', loopOn);
    await evaluate(window, `() => { const select = document.querySelector('select[aria-label="Playback speed"]'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, '1.5'); select.dispatchEvent(new Event('change', { bubbles: true })); return true; }`);
    await runArg(clickAria, 'Play');
    await wait(window, `() => { const video = document.querySelector('video'); return video && !video.paused && Math.abs(video.playbackRate - 1.5) < 0.01; }`, 'playback at 1.5x', 20000);
    const seekStart = await evaluate(window, `() => document.querySelector('video').currentTime`);
    await runArg(`start => { window.__loopStart = start; window.__loopPassed = false; return true; }`, seekStart);
    const looped = await wait(window, `() => { const video = document.querySelector('video'); if (!video) return false; if (video.currentTime >= window.__loopStart + 2) window.__loopPassed = true; return window.__loopPassed && video.currentTime < window.__loopStart + 0.5; }`, 'sentence loop wrap', 60000).catch(() => false);
    check('sentence loop wraps playback', !!looped);
    await runArg(clickAria, 'Pause');
    await new Promise(resolve => setTimeout(resolve, 600));
    const paused = await evaluate(window, videoInfo);
    const finalIndex = await evaluate(window, selectedRowIndex);
    await shot(window, '03-listening.png');
    // Re-read sqlite at the end of the phase; the initial facts snapshot predates the import.
    const persisted = mainFacts();
    facts.sqliteCounts = persisted.sqliteCounts;
    check('builtin sqlite created with learning tables', persisted.sqliteCounts && persisted.sqliteCounts.media === 1 && persisted.sqliteCounts.segments > 0, JSON.stringify(persisted.sqliteCounts || {}));
    return { facts, sentenceCount: count, processMs, video: paused, selectedIndex: finalIndex, loopVerified: !!looped };
  },

  async reopen() {
    const facts = mainFacts();
    await waitForBridge();
    await wait(window, `() => (${sentences})() > 0 && !(${busy})() && [...document.querySelectorAll('button')].some(b => b.textContent === '重新处理')`, 'restored state without reprocessing', 60000);
    const count = await evaluate(window, sentences);
    const info = await evaluate(window, videoInfo);
    const index = await evaluate(window, selectedRowIndex);
    check('cached segments reopen without reprocessing', count === EXTRA.expectedSentences, count + ' vs expected ' + EXTRA.expectedSentences);
    check('learning position restored', Math.abs(info.currentTime - EXTRA.expectedPosition) < 3, info.currentTime + ' vs ' + EXTRA.expectedPosition);
    check('selected sentence restored', index === EXTRA.expectedIndex, index + ' vs ' + EXTRA.expectedIndex);
    check('media still served from managed url', info.src.startsWith('inflow://'), info.src);
    await runArg(clickByText, 'Library');
    await new Promise(resolve => setTimeout(resolve, 800));
    const drawerText = await evaluate(window, `() => document.body.textContent.includes(${JSON.stringify(EXTRA.mediaName)})`);
    check('library lists the saved media', drawerText, EXTRA.mediaName);
    await shot(window, '04-reopen.png');
    const status = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.modelStatus())`));
    check('model status ready in settings data', status.whisper && status.englishParser, status);
    check('sqlite retains segments', facts.sqliteCounts && facts.sqliteCounts.segments === EXTRA.expectedSentences, JSON.stringify(facts.sqliteCounts || {}));
    return { facts, sentenceCount: count, video: info, selectedIndex: index };
  },

  async missing() {
    const facts = mainFacts();
    // The managed copy under userData/media must be gone; the original source file stays intact.
    const managedDir = path.join(app.getPath('userData'), 'media');
    const managedLeft = fs.existsSync(managedDir) ? fs.readdirSync(managedDir) : [];
    check('media file deleted from managed storage', managedLeft.length === 0, managedLeft.join(',') || 'empty');
    check('source media still present for relink', fs.existsSync(MEDIA), MEDIA);
    await waitForBridge();
    await wait(window, `() => { const notice = document.querySelector('.workspace-notice[role="alert"]'); return notice && notice.textContent.includes('媒体文件丢失'); }`, 'missing media notice', 60000);
    const count = await evaluate(window, sentences);
    check('transcript preserved after media loss', count === EXTRA.expectedSentences, count + ' vs expected ' + EXTRA.expectedSentences);
    const relink = await evaluate(window, `() => !![...document.querySelectorAll('button')].find(b => b.textContent === '重新关联媒体')`);
    check('relink action offered', relink);
    await shot(window, '05-missing-media.png');
    const before = JSON.parse(await run(`async () => JSON.stringify({ vocabulary: await window.inflow.listVocabulary(), artifacts: await window.inflow.listArtifacts() })`));
    await runArg(clickByText, '重新关联媒体');
    await wait(window, `() => !document.querySelector('.workspace-notice[role="alert"]')`, 'media relink');
    const after = JSON.parse(await run(`async () => JSON.stringify({ vocabulary: await window.inflow.listVocabulary(), artifacts: await window.inflow.listArtifacts() })`));
    check('relink retains vocabulary, sources and artifacts', JSON.stringify(after) === JSON.stringify(before));
    await shot(window, '05-relinked-media.png');
    return { facts, sentenceCount: count };
  },

  async cancel() {
    const facts = mainFacts();
    await waitForBridge();
    await runArg(clickByText, '导入媒体');
    await wait(window, busy, 'processing to start', 60000);
    await new Promise(resolve => setTimeout(resolve, 10000));
    await runArg(clickByText, '取消处理');
    await wait(window, idleRetry, 'cancel to return control', 30000);
    const count = await evaluate(window, sentences);
    check('cancellation leaves empty transcript without false success', count === 0, 'sentences ' + count);
    await new Promise(resolve => setTimeout(resolve, 4000));
    await shot(window, '06-cancelled.png');
    return { facts, cancelled: true };
  },

  async cycle() {
    const facts = mainFacts();
    await waitForBridge();
    const credential = await configureKeyViaUI(CREDENTIAL);
    check('credential configured for live generation', credential, 'configured via settings dialog; key not recorded');
    // A profile restored from an earlier partial run already has the media transcribed; give the
    // restore a moment before deciding the workspace is empty.
    let restored = 0;
    for (let attempt = 0; attempt < 8 && !restored; attempt++) {
      restored = await evaluate(window, sentences);
      if (!restored) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    let count = restored;
    if (!restored) {
      await runArg(clickByText, '导入媒体');
      await wait(window, busy, 'processing to start', 60000);
      const started = Date.now();
      count = await wait(window, sentences, 'sentences', 600000);
      check('transcription completed for cycle', count > 0, count + ' sentences in ' + (Date.now() - started) + 'ms');
    } else {
      check('transcription completed for cycle', true, restored + ' sentences restored from previous run');
    }
    check('source text visible by default', await evaluate(window, `() => !!document.querySelector('.workspace-group-text') && !document.querySelector('.hidden-group')`));
    await runArg(clickByText, 'Set masks');
    await runArg(`() => document.querySelector('.workspace-mask-group').click()`);
    await wait(window, `() => !!document.querySelector('.hidden-group')`, 'masked group');
    await runArg(clickByText, 'Set masks');
    check('mask exit reveals complete source', await evaluate(window, `() => !document.querySelector('.hidden-group') && !!document.querySelector('.workspace-group-text')`));
    await runArg(clickByText, 'Set masks');
    check('saved masks apply only in mask mode', await evaluate(window, `() => !!document.querySelector('.hidden-group')`));
    await runArg(clickByText, 'Set masks');
    await runArg(clickAria, 'Show Chinese translation');
    await wait(window, `() => !!document.querySelector('.workspace-translation p[lang="zh"]')`, 'live sentence translation', 90000);
    await runArg(clickAria, 'Next sentence');
    check('sentence changes hide translation and exit masks', await evaluate(window, `() => !document.querySelector('.workspace-translation') && !document.querySelector('.hidden-group')`));
    await runArg(clickAria, 'Previous sentence');
    const word1 = await collectWordFrom('.workspace-sentence-text');
    const vocabulary1 = await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`);
    check('first vocabulary entry saved with media source', JSON.parse(vocabulary1).length === 1, vocabulary1);
    await shot(window, '07-collected-word.png');
    await runArg(clickAria, 'Hide video subtitles');
    await wait(window, `() => !!document.querySelector('.workspace-video-mask')`, 'video subtitle mask');
    await runArg(clickAria, 'Finish subtitle mask adjustment');
    await runArg(clickAria, 'Next sentence');
    await runArg(clickByText, 'Sentence');
    await runArg(clickAria, 'Loop sentence');
    await runArg(`() => { const select = document.querySelector('select[aria-label="Playback speed"]'); select.value = '1.5'; select.dispatchEvent(new Event('change', { bubbles: true })); }`);
    await runArg(clickByText, 'Vocab');
    await wait(window, `() => !!document.querySelector('#notebook')`, 'notebook');
    await generateStory(EXTRA.topic1, [word1.lemma]);
    const artifacts1 = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listArtifacts())`));
    check('first story generated', artifacts1.length === 1 && artifacts1[0].sentences.length >= 1, 'sentences ' + (artifacts1[0]?.sentences?.length ?? 0) + ', elapsedMs ' + artifacts1[0]?.elapsedMs);
    check('artifact covers collected target', JSON.stringify(artifacts1[0]?.targets?.map(t => t.lemma)) === JSON.stringify([word1.lemma]), JSON.stringify(artifacts1[0]?.targets));
    await shot(window, '08-story-one.png');
    const word2 = await collectWordFrom('.artifact-korean');
    const vocabulary2 = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`));
    check('second vocabulary entry saved with artifact source', vocabulary2.length === 2, 'lemma ' + word2.lemma);
    await runArg(clickByText, 'Vocab');
    await generateStory(EXTRA.topic2, [word2.lemma]);
    const artifacts2 = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listArtifacts())`));
    check('second story generated from collected word', artifacts2.length === 2 && JSON.stringify(artifacts2[0]?.targets?.map(t => t.lemma)) === JSON.stringify([word2.lemma]), JSON.stringify(artifacts2.map(a => ({ title: a.title, targets: a.targets?.map(t => t.lemma) }))));
    await shot(window, '09-story-two.png');
    const index = await evaluate(window, selectedRowIndex);
    const info = await evaluate(window, videoInfo);
    const learning = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.restore())`));
    const vocabulary = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`));
    return { facts: mainFacts(), sentences: count, word1, word2, vocabulary, artifacts: artifacts2, learning, selectedIndex: index, position: info.currentTime };
  },

  async failures() {
    const facts = mainFacts();
    await waitForBridge();
    const invalid = await configureKeyViaUI('sk-invalid-inflow-acceptance-key');
    check('invalid credential accepted by host', invalid, 'host stores it; API will reject');
    const before = { vocabulary: JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`)), artifacts: JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listArtifacts())`)) };
    check('pre-existing material present before failure test', before.vocabulary.length === 2 && before.artifacts.length === 2, 'vocab ' + before.vocabulary.length + ', artifacts ' + before.artifacts.length);
    await openLibraryKind('VIDEO');
    const mediaBefore = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.restore())`));
    await runArg(clickByText, '重新处理');
    await wait(window, busy, 'retranscription starts');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await runArg(clickByText, '取消处理');
    await wait(window, `() => !(${busy})()`, 'retranscription cancellation', 30000);
    const mediaAfter = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.restore())`));
    check('cancelled retranscription retains transcript and masks', JSON.stringify(mediaAfter.segments) === JSON.stringify(mediaBefore.segments) && JSON.stringify(mediaAfter.learning.masks) === JSON.stringify(mediaBefore.learning.masks));
    await runArg(clickByText, 'Vocab');
    await wait(window, `() => { const b = document.querySelector('.vocab-generate'); return b && !b.disabled; }`, 'Generate story button enabled', 20000);
    await runArg(`() => { document.querySelector('.vocab-generate').click(); return true; }`);
    await wait(window, `() => !!document.querySelector('dialog.workspace-target-dialog')`, 'target dialog', 20000);
    await runArg(clickByText, 'Continue');
    await wait(window, `() => !!document.querySelector('dialog.story-generation-dialog')`, 'generation dialog', 20000);
    await runArg(`() => { const buttons = [...document.querySelectorAll('dialog.story-generation-dialog footer button')]; const submit = buttons.find(b => b.textContent === 'Generate story' || b.textContent === 'Retry generation'); if (!submit) throw new Error('no generation submit button'); if (submit.disabled) throw new Error('generation submit disabled'); submit.click(); return true; }`);
    await wait(window, `() => { const notice = document.querySelector('dialog.story-generation-dialog .story-notice[role="alert"]'); return notice && notice.textContent.length > 0; }`, 'generation failure notice', 240000);
    const message = await evaluate(window, `() => document.querySelector('dialog.story-generation-dialog .story-notice[role="alert"]').textContent`);
    check('generation failure surfaced in dialog', message.length > 0, message);
    await shot(window, '10-generation-failure.png');
    await runArg(clickByText, 'Cancel');
    const after = { vocabulary: JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`)), artifacts: JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listArtifacts())`)) };
    check('material retained after generation failure', JSON.stringify(after) === JSON.stringify(before), 'vocabulary, sources, artifacts and target snapshots unchanged');
    check('valid credential restored after failure exercise', await configureKeyViaUI(CREDENTIAL));
    return { facts, errorMessage: message };
  },

  async restart() {
    const facts = mainFacts();
    await waitForBridge();
    await wait(window, `() => (${sentences})() > 0`, 'restored learning', 60000);
    const index = await evaluate(window, selectedRowIndex);
    const info = await evaluate(window, videoInfo);
    const expected = EXTRA.expected;
    check('learning restored across restart', index === (expected?.selectedIndex ?? EXTRA.expectedIndex) && Math.abs(info.currentTime - (expected?.position ?? EXTRA.expectedPosition)) < 3, 'index ' + index + ', position ' + info.currentTime.toFixed(1));
    const vocabulary = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listVocabulary())`));
    check('vocabulary restored', vocabulary.length === 2, JSON.stringify(vocabulary.map(entry => entry.lemma)));
    const artifacts = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.listArtifacts())`));
    check('stories restored', artifacts.length === 2, JSON.stringify(artifacts.map(a => a.title)));
    check('artifact source references retained', artifacts.every(a => (a.targets || []).length >= 1), JSON.stringify(artifacts.map(a => a.targets?.map(t => t.lemma))));
    const restored = JSON.parse(await run(`async () => JSON.stringify(await window.inflow.restore())`));
    if (expected) {
      check('cached transcript and preferences restored exactly', JSON.stringify(restored) === JSON.stringify(expected.learning));
      check('vocabulary source references and selections restored exactly', JSON.stringify(vocabulary) === JSON.stringify(expected.vocabulary));
      check('artifacts and historical target snapshots restored exactly', JSON.stringify(artifacts) === JSON.stringify(expected.artifacts));
    }
    check('restart reveals source and hides translation', await evaluate(window, `() => !!document.querySelector('.workspace-group-text') && !document.querySelector('.hidden-group') && !document.querySelector('.workspace-translation')`));
    check('video subtitle mask restored', await evaluate(window, `() => !!document.querySelector('.workspace-video-mask')`));
    await runArg(clickByText, 'Vocab');
    await wait(window, `() => document.querySelectorAll('.vocab-row').length >= 2`, 'notebook rows', 20000);
    await shot(window, '11-restart-vocabulary.png');
    await runArg(clickByText, 'Library');
    await new Promise(resolve => setTimeout(resolve, 800));
    await shot(window, '12-restart-library.png');
    check('sqlite persistent counts', facts.sqliteCounts && facts.sqliteCounts.vocabulary === 2 && facts.sqliteCounts.artifacts === 2, JSON.stringify(facts.sqliteCounts || {}));
    return { facts, selectedIndex: index, vocabulary: vocabulary.map(entry => ({ lemma: entry.lemma, language: entry.language })), artifacts: artifacts.map(a => ({ title: a.title, sentenceCount: a.sentences?.length })) };
  },
};

(async () => {
  let failed = null;
  try {
    await app.whenReady();
    window = await window_();
    window.webContents.setBackgroundThrottling(false);
    await wait(window, `() => !!window.inflow`, 'renderer bridge', 60000);
    const runner = phases[PHASE];
    if (!runner) throw new Error('unknown phase ' + PHASE);
    phaseResult = (await runner()) || {};
  } catch (failure) {
    failed = failure;
    errors.push(String(failure && failure.stack || failure));
    try { if (window) await shot(window, '99-failure-state.png'); } catch { /* screenshot best effort */ }
  } finally {
    const result = {
      phase: PHASE,
      ok: !failed,
      errors,
      consoleErrors,
      checks,
      ...phaseResult,
    };
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(result, null, 2));
    if (failed) console.error('VERIFY-FAIL ' + PHASE + ': ' + (failed && failed.message || failed));
    else console.error('VERIFY-OK ' + PHASE);
    setTimeout(() => app.exit(failed ? 1 : 0), 500);
  }
})();
