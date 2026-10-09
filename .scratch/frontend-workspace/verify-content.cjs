/* eslint @typescript-eslint/no-require-imports: off -- Isolated Electron layout check. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

async function run() {
  if (!process.versions.electron) {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    return new Promise((resolve, reject) => {
      const child = require('node:child_process').spawn(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Content check exited ${code}`)));
    });
  }
  const { app, BrowserWindow, ipcMain } = require('electron');
  const root = path.resolve(__dirname, '../..');
  await fs.mkdir(path.join(root, '.scratch/desktop-learning/generated-samples'), { recursive: true });
  const output = await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/content-layout-'));
  app.setPath('userData', path.join(output, 'profile'));
  const groups = Array.from({ length: 80 }, (_, index) => `Long sentence group ${index + 1}.`);
  const media = { id: 'layout', name: 'Layout fixture', language: 'en', video: false, missing: true,
    learning: { position: 0, index: 0, duration: 8, rate: 1, loop: false, mode: 'sentence' },
    segments: [{ id: 'short', start: 0, end: 2, text: 'Short sentence.', groups: ['Short sentence.'] },
      { id: 'long', start: 2, end: 8, text: groups.join(' '), groups }] };
  for (const [method, result] of Object.entries({ restore: media, list: [media], getSettings: { videoMaskColor: '#000000' },
    credentialStatus: { configured: false }, listVocabulary: [], listArtifacts: [], restoreArtifact: null, saveLearning: null, cancel: null,
    translate: 'Long translation. '.repeat(100) })) ipcMain.handle(`inflow:${method}`, () => result);
  await app.whenReady();
  const window = new BrowserWindow({ width: 1440, height: 900, useContentSize: true, show: false,
    webPreferences: { preload: path.join(root, 'desktop/preload.cjs'), backgroundThrottling: false, offscreen: true } });
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const settle = () => evaluate('new Promise(resolve => setTimeout(resolve, 100))');
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await settle(); };
  const geometry = () => evaluate(`(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top:Math.round((r.top+scrollY)*100)/100, height:Math.round(r.height*100)/100, bottom:Math.round((r.bottom+scrollY)*100)/100 }; };
    const copy = document.querySelector('.workspace-sentence-copy');
    return { grid:rect('.workspace-content-grid'), column:rect('.workspace-main-column'), stage:rect('.workspace-video-stage'),
      sentence:rect('.workspace-sentence-area'), toolbar:rect('.workspace-player-toolbar'), copyHeight:copy.clientHeight,
      copyScroll:copy.scrollHeight, pageHeight:document.documentElement.scrollHeight, viewportHeight:innerHeight,
      pageWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth };
  })()`);
  try {
    await window.loadURL(process.env.INFLOW_CONTENT_URL || 'http://127.0.0.1:3000');
    for (let count = 0; count < 100; count++) {
      if (await evaluate('document.querySelectorAll(".workspace-context-row").length === 2')) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await evaluate('document.querySelector(".workspace-notice")?.remove()');
    for (const [width, height] of [[1440, 900], [1100, 800], [900, 650], [390, 760]]) {
      window.setContentSize(width, height); await settle();
      await click('.workspace-context-row:first-child');
      const short = await geometry();
      await click('.workspace-context-row:last-child');
      const long = await geometry();
      console.log(`Checking ${width}x${height}: workspace ${short.column.height}px -> ${long.column.height}px`);
      for (const key of ['grid', 'column', 'stage', 'sentence', 'toolbar']) assert.deepEqual(long[key], short[key], `Long sentence moved ${key} at ${width}x${height}`);
      assert.ok(long.toolbar.height >= 44, 'Playback toolbar must remain visible when the sentence area is resized');
      assert.ok(long.toolbar.bottom <= long.sentence.bottom + 1, 'Playback toolbar must stay inside the sentence area');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".workspace-sentence-options")).flexWrap'), 'nowrap', 'Playback controls must stay on one horizontal row');
      assert.ok(long.copyScroll > long.copyHeight, 'Long sentence must scroll internally');
      assert.ok(long.pageWidth <= width, 'No horizontal page overflow');
      await click('button[aria-label="Show Chinese translation"]');
      assert.deepEqual((await geometry()).toolbar, long.toolbar, 'Translation moved playback controls');
      await click('.workspace-mask-toggle');
      assert.deepEqual((await geometry()).column, long.column, 'Mask mode expanded the workspace');
      await evaluate('document.querySelector(".workspace-sentence-copy").scrollTop = 100000');
      assert.ok(await evaluate('document.querySelector(".workspace-sentence-copy").scrollTop > 0'));
      await click('.workspace-context-row:first-child'); await click('.workspace-context-row:last-child');
      assert.equal(await evaluate('document.querySelector(".workspace-sentence-copy").scrollTop'), 0, 'New sentence must start at top');
      const divider = '.workspace-stage-divider';
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(divider)}).getAttribute('role')`), 'separator');
      const key = async (value, selector = divider) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); window.webContents.sendInputEvent({ type: 'keyDown', keyCode: value }); window.webContents.sendInputEvent({ type: 'keyUp', keyCode: value }); await settle(); };
      await key('Home'); const minimum = (await geometry()).stage.height;
      await key('End'); const maximum = (await geometry()).stage.height;
      assert.equal(minimum, 140); assert.ok(maximum > minimum);
      await key('Down'); assert.equal((await geometry()).stage.height, maximum, 'Keyboard resize exceeded maximum');
      const drag = async (offset, selector = divider, horizontal = false) => {
        const point = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2) }; })()`);
        for (const event of [{ type:'mouseDown', x:point.x, y:point.y, button:'left', clickCount:1 },
          { type:'mouseMove', x:point.x+(horizontal ? offset : 0), y:point.y+(horizontal ? 0 : offset), button:'left' },
          { type:'mouseUp', x:point.x+(horizontal ? offset : 0), y:point.y+(horizontal ? 0 : offset), button:'left', clickCount:1 }]) window.webContents.sendInputEvent(event);
        await settle();
      };
      await key('Home'); await drag(40); assert.equal((await geometry()).stage.height, 180, 'Pointer drag did not resize stage');
      await drag(-1000); assert.equal((await geometry()).stage.height, minimum, 'Pointer resize exceeded minimum');
      await drag(1000); assert.equal((await geometry()).stage.height, maximum, 'Pointer resize exceeded maximum');
      assert.equal((await geometry()).column.height, long.column.height, 'Resizing expanded workspace');
      const contextDivider = '.workspace-context-divider';
      if (width > 860) {
        const contextWidth = () => evaluate('document.querySelector(".workspace-context-panel").clientWidth');
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(contextDivider)})?.getAttribute('role')`), 'separator', 'Context must have a resize separator');
        await key('Home', contextDivider); assert.equal(await contextWidth(), 240);
        await key('Right', contextDivider); assert.equal(await contextWidth(), 240, 'Context keyboard resize exceeded minimum');
        await drag(-40, contextDivider, true); assert.equal(await contextWidth(), 280, 'Context drag did not resize');
        await drag(1000, contextDivider, true); assert.equal(await contextWidth(), 240);
        await key('End', contextDivider);
        const contextMaximum = await contextWidth();
        assert.equal(contextMaximum, await evaluate('Math.min(480, document.querySelector(".workspace-content-grid").clientWidth - 520)'));
        await key('Left', contextDivider); assert.equal(await contextWidth(), contextMaximum);
        await drag(-1000, contextDivider, true); assert.equal(await contextWidth(), contextMaximum);
        assert.equal((await geometry()).column.height, long.column.height, 'Context resize expanded workspace');
      } else assert.equal(await evaluate(`document.querySelector(${JSON.stringify(contextDivider)})?.checkVisibility()`), false, 'Hide sidebar resizing when Context stacks below content');
      await click('.workspace-topnav button[aria-haspopup="dialog"]');
      assert.equal(await evaluate('document.querySelector(".workspace-library-dialog").open'), true);
      await evaluate('document.querySelector(".workspace-library-search input").focus()');
      const search = await evaluate(`(() => { const input=document.querySelector('.workspace-library-search input'), style=getComputedStyle(input); return { radius:style.borderRadius, outline:style.outlineStyle }; })()`);
      assert.equal(search.radius, '0px'); assert.equal(search.outline, 'none', 'Search must not show a purple focus outline');
      await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await fs.writeFile(path.join(output, `library-search-${width}.png`), (await window.webContents.capturePage()).toPNG());
      await click('button[aria-label="Close library"]');
      await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await fs.writeFile(path.join(output, `content-${width}.png`), (await window.webContents.capturePage()).toPNG());
    }
    console.log(`PASS: bounded video/Context pointer and keyboard resize, stable long sentences and square Library search without a purple outline.\nEvidence: ${output}`);
  } finally { window.destroy(); app.quit(); }
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
