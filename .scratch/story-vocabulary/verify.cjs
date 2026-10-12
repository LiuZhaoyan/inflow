/* eslint @typescript-eslint/no-require-imports: off -- Native Story regression check. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

async function run() {
  if (!process.versions.electron) {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    return new Promise((resolve, reject) => {
      const child = require('node:child_process').spawn(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Story check exited ${code}`)));
    });
  }
  const { app, BrowserWindow, ipcMain } = require('electron');
  const root = path.resolve(__dirname, '../..');
  const parent = path.join(root, '.scratch/desktop-learning/generated-samples');
  await fs.mkdir(parent, { recursive: true });
  const profile = await fs.mkdtemp(path.join(parent, 'story-vocabulary-'));
  app.setPath('userData', profile);
  const story = { id: 'story', title: 'A walk', language: 'en', createdAt: '2026-10-11T00:00:00.000Z',
    targets: [{ id: 'walk', lemma: 'walk', meaningZh: '步行' }], sentences: [
      { parts: [{ text: 'I ', targetId: null }, { text: 'walk', targetId: 'walk' }, { text: ' home then home.', targetId: null }], translationZh: '我走回家。' },
      { parts: [{ text: 'Home is quiet.', targetId: null }], translationZh: '家很安静。' },
    ] };
  let entries = [{ ...story.targets[0], language: 'en', selected: false, contexts: [] }], failSave = false;
  for (const [method, result] of Object.entries({ restore: null, list: [], getSettings: { videoMaskColor: '#000000', interfaceLocale: 'en' },
    credentialStatus: { configured: false }, listArtifacts: [story], restoreArtifact: story, openArtifact: story, cancel: null })) {
    ipcMain.handle(`inflow:${method}`, () => result);
  }
  ipcMain.handle('inflow:listVocabulary', () => entries);
  ipcMain.on('inflow:acceptArtifact', event => { event.returnValue = { artifact:story }; });
  ipcMain.handle('inflow:listArtifactVocabulary', () => entries.filter(entry => entry.contexts.length));
  ipcMain.handle('inflow:lookupVocabulary', (_event, input) => ({ surface: input.surface, language: 'en', lemma: input.surface.toLowerCase(), candidates: [], meaningZh: '家' }));
  ipcMain.handle('inflow:saveVocabulary', (_event, input) => {
    if (failSave) throw new Error('Fixture write failure');
    let entry = entries.find(item => item.lemma === input.lemma && item.meaningZh === input.meaningZh);
    if (!entry) { entry = { id: 'home', language: 'en', lemma: input.lemma, meaningZh: input.meaningZh, selected: false, contexts: [] }; entries.push(entry); }
    const context = entry.contexts.find(item => item.source.sentenceIndex === input.context.source.sentenceIndex && item.surface === input.context.surface);
    if (context) context.surfaceStarts.push(input.context.surfaceStart);
    else entry.contexts.push({ ...input.context, id: 'context-' + entry.contexts.length, surfaceStarts: [input.context.surfaceStart] });
    return entry;
  });
  await app.whenReady();
  const window = new BrowserWindow({ show: false, width: 1440, height: 900,
    webPreferences: { preload: path.join(root, 'desktop/preload.cjs'), backgroundThrottling: false } });
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(code) {
    for (let n = 0; n < 200; n++) { if (await evaluate(code)) return; await delay(50); }
    throw new Error(`Timed out: ${code}; ${await evaluate('JSON.stringify({selection: getSelection()?.toString(), active: document.activeElement?.outerHTML.slice(0, 200), notices: [...document.querySelectorAll("[role=alert], [role=status]")].map(el => el.textContent)})')}`);
  }
  async function collect(sentenceIndex, start, length) {
    await evaluate(`(() => {
      const p = document.querySelector('#artifact-sentence-${sentenceIndex}');
      const nodes = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), range = document.createRange();
      let offset = 0, node, begun = false;
      while ((node = nodes.nextNode())) {
        const end = offset + node.textContent.length;
        if (!begun && ${start} >= offset && ${start} < end) { range.setStart(node, ${start} - offset); begun = true; }
        if (begun && ${start + length} <= end) { range.setEnd(node, ${start + length} - offset); break; }
        offset = end;
      }
      getSelection().removeAllRanges(); getSelection().addRange(range);
    })()`);
    await wait('!!document.querySelector(".vocabulary-selection button[type=submit]") && !document.querySelector(".vocabulary-selection button[type=submit]").disabled');
    await evaluate('document.querySelector(".vocabulary-selection button[type=submit]").click()');
    if (!failSave) await wait('!document.querySelector(".vocabulary-selection")');
    await delay(250);
  }
  try {
    await window.loadURL(process.env.INFLOW_VERIFY_URL || 'http://localhost:3010');
    await wait('!!document.querySelector(".workspace-library-item") || !!document.querySelector(".story-sentences")');
    await evaluate('document.querySelector(".workspace-topnav button[aria-haspopup=dialog]").click()');
    await wait('!!document.querySelector(".workspace-library-item")');
    await evaluate('[...document.querySelectorAll(".workspace-library-item")].find(el => el.textContent.includes("A walk")).click()');
    await wait('document.querySelector(".story-sentences")?.checkVisibility()');
    await collect(0, 7, 4);
    await delay(300);
    assert.equal(await evaluate('document.querySelectorAll("#artifact-sentence-0 mark[data-vocabulary-id]").length'), 1, 'Collected word must be marked immediately');
    assert.equal(await evaluate('document.querySelector(".story-collected-vocabulary header span")?.textContent'), '1 word');
    assert.equal(await evaluate('document.querySelector(".story-collected-vocabulary button")?.textContent'), 'home');
    await collect(0, 17, 4);
    await collect(1, 0, 4);
    await delay(300);
    assert.equal(await evaluate('document.querySelectorAll("mark[data-vocabulary-id]").length'), 3);
    assert.equal(await evaluate('document.querySelector(".story-collected-vocabulary header span").textContent'), '1 word');
    assert.equal(await evaluate('document.querySelector("#artifact-sentence-0").textContent'), 'I walk home then home.');
    assert.equal(await evaluate('document.querySelectorAll("mark[data-target-id=walk]").length'), 1);
    await new Promise(resolve => { window.webContents.once('did-finish-load', resolve); window.reload(); });
    await wait('!!document.querySelector(".story-sentences")');
    await evaluate('document.querySelector(".workspace-topnav button[aria-haspopup=dialog]").click()');
    await wait('!!document.querySelector(".workspace-library-item")');
    await evaluate('document.querySelector(".workspace-library-item").click()');
    await wait('document.querySelectorAll("mark[data-vocabulary-id]").length === 3');
    failSave = true;
    await collect(1, 8, 5);
    await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Fixture write failure")');
    assert.equal(await evaluate('document.querySelectorAll("mark[data-vocabulary-id]").length'), 3);
    console.log('PASS: Story collection updates marks and sidebar, retains all occurrences on reload, preserves targets and does not mark failed saves.');
  } finally { window.destroy(); app.quit(); }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
