/* eslint @typescript-eslint/no-require-imports: off -- Isolated native Electron research. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const runtime = process.env.INFLOW_ORDERING_RUNTIME_ROOT || root;
const scenarios = ['ordinary-history', 'ordinary-library', 'history-reply', 'library-reply', 'mixed-reply', 'draft-reply', 'restore-reply', 'generation'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  if (!process.versions.electron) {
    const output = await fs.mkdtemp(path.join(runtime, '.scratch/desktop-learning/generated-samples/ordering-native-'));
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const results = [];
    for (const scenario of scenarios) {
      for (const phase of ['run', 'restart']) {
        await new Promise((resolve, reject) => {
          const child = require('node:child_process').spawn(require('electron'), [__filename, output, scenario, phase], { env, stdio: 'inherit', windowsHide: true });
          child.on('error', reject);
          child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${scenario}/${phase} exited ${code}; evidence: ${output}`)));
        });
      }
      results.push(JSON.parse(await fs.readFile(path.join(output, `${scenario}.json`), 'utf8')));
    }
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, runtime, scenarios: results }, null, 2));
    console.log(`PASS: eight ordering investigations and eight fresh-process restorations.\nEvidence: ${output}`);
    return;
  }
  const [output, scenario, phase] = process.argv.slice(2);
  const { app, BrowserWindow, protocol, ipcMain } = require('electron');
  setTimeout(() => { console.error(`Timed out: ${scenario}/${phase}`); app.exit(1); }, 45000).unref();
  protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
  const profile = path.join(output, scenario);
  app.setPath('userData', profile);
  const { DesktopOperations } = require(path.join(runtime, 'build/desktop/desktop/operations.js'));
  const trace = [], lookups = [], pending = [];
  let hold = null, releaseGeneration;
  const processor = async (mode, ...args) => mode === 'lookup' ? { ...args[2], lemma: args[2].surface } : {};
  const generator = async input => {
    if (releaseGeneration !== undefined) await new Promise(resolve => { releaseGeneration = resolve; });
    return { title: input.topic || 'fixture', requestedModel: 'fixture', sentences: [{ parts: [{ text: input.targets[0].lemma, targetId: input.targets[0].id }], translationZh: '朋友' }] };
  };
  const ops = new DesktopOperations(profile, processor, generator);
  let A, B, C, previous;
  if (phase === 'run') {
    const word = ops.saveVocabulary({ language: 'en', lemma: 'friend', meaningZh: '朋友' });
    A = await ops.generateArtifact([word.id], 'Story A', 'seed-a', 'fixture');
    B = await ops.generateArtifact([word.id], 'Story B', 'seed-b', 'fixture');
    C = await ops.generateArtifact([word.id], 'Story C', 'seed-c', 'fixture');
    if (scenario === 'restore-reply') hold = { method: 'restoreArtifact' };
  } else {
    previous = JSON.parse(await fs.readFile(path.join(output, `${scenario}.json`), 'utf8'));
    [A, B, C] = ['Story A', 'Story B', 'Story C'].map(title => ops.listArtifacts().find(item => item.title === title));
  }
  // Keep real host security checks and synchronous open/restore execution. Only delivery is held.
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, handler) => handle(channel, async (event, ...args) => {
    const method = channel.replace('inflow:', '');
    if (method === 'credentialStatus') return { configured: true };
    if (method === 'lookupVocabulary') {
      lookups.push(args[0]);
      return ops.lookupVocabulary(...args);
    }
    const value = method === 'generateArtifact' ? await ops.generateArtifact(...args, 'fixture') : await handler(event, ...args);
    if (['openArtifact', 'restoreArtifact', 'generateArtifact'].includes(method)) {
      trace.push({ event: 'host-complete', method, requested: args[0], returned: value?.id, hostActive: ops.restoreArtifact()?.id });
    }
    if (hold?.method === method && (!hold.id || hold.id === args[0])) {
      hold = null;
      await new Promise(resolve => pending.push(resolve));
    }
    if (['openArtifact', 'restoreArtifact', 'generateArtifact'].includes(method)) trace.push({ event: 'reply', method, returned: value?.id });
    return value;
  });
  const { GenerationCredential } = require(path.join(runtime, 'build/desktop/desktop/credentials.js'));
  GenerationCredential.prototype.initialize = async function () {};
  global.fetch = async () => { throw new Error('Ordering research must not contact a model provider.'); };
  const errors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide(); window.webContents.setBackgroundThrottling(false);
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  });
  protocol.registerSchemesAsPrivileged = () => {};
  require(path.join(runtime, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  async function wait(code) {
    for (let count = 0; count < 200; count++) { if (await evaluate(code)) return; await delay(25); }
    throw new Error(`Timed out: ${code}; UI: ${JSON.stringify(await evaluate('({library:document.querySelector(".workspace-library-dialog")?.open,expanded:document.querySelector(".workspace-topnav button")?.getAttribute("aria-expanded"),alert:document.querySelector("[role=alert]")?.textContent})'))}`);
  }
  async function waitPending() {
    for (let count = 0; !pending.length && count < 200; count++) await delay(25);
    assert.equal(pending.length, 1);
  }
  async function click(selector, text = '') {
    assert.ok(await evaluate(`(() => { const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.checkVisibility() && (!${JSON.stringify(text)} || el.textContent.startsWith(${JSON.stringify(text)}))); if (!el) return false; el.click(); return true; })()`), `${selector}: ${text}`);
    await delay(25);
  }
  async function library(artifact) {
    await click('.workspace-topnav button', 'Library');
    await wait('document.querySelector(".workspace-library-dialog").open');
    await closeLibrary('.workspace-library-item', 'STORY' + artifact.title);
  }
  async function closeLibrary(selector, text) {
    await click(selector, text);
    await wait('document.querySelector(".workspace-topnav button").getAttribute("aria-expanded") === "false"');
    // ponytail: 100 ms settle for queued native close events; use event acknowledgement if slower hosts need it.
    await delay(100);
  }
  async function history(artifact) {
    await evaluate(`(() => { document.querySelector('.story-options').open=true; const el=document.querySelector('select[aria-label="Open saved story"]'); el.value=${JSON.stringify(artifact.id)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  }
  const reader = artifact => wait(`document.querySelector('.story-sentences')?.dataset.artifactId === ${JSON.stringify(artifact.id)}`);
  async function snapshot(label) {
    const state = await evaluate(`(async () => ({reader:document.querySelector('.story-sentences')?.dataset.artifactId || null, readerVisible:!!document.querySelector('.story-sentences')?.checkVisibility(), libraryTitle:document.querySelector('.workspace-library-item[aria-current=true] strong')?.textContent || null, hostRestore:(await window.inflow.restoreArtifact())?.id || null, vocabulary:(await window.inflow.listVocabulary()).filter(entry=>entry.contexts.length).map(entry=>({meaning:entry.meaningZh,source:entry.contexts[0].source.artifactId}))}))()`);
    return { label, ...state, hostDirect: ops.restoreArtifact()?.id || null };
  }
  async function collect(label, save = true) {
    await evaluate(`(() => { document.activeElement?.blur(); const range=document.createRange(); range.selectNodeContents(document.querySelector('.artifact-korean')); getSelection().removeAllRanges(); getSelection().addRange(range); })()`);
    await wait('!!document.querySelector(".vocabulary-selection input[name=meaningZh]")');
    await wait('!document.querySelector(".vocabulary-selection [role=status]")?.textContent.includes("Finding dictionary")');
    const source = lookups.at(-1).source.artifactId;
    await evaluate(`(() => { const el=document.querySelector('.vocabulary-selection input[name=meaningZh]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(label)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await delay(25);
    if (save) { await click('.vocabulary-selection button[type=submit]'); await wait('!document.querySelector(".vocabulary-selection")'); }
    return source;
  }
  await wait('!!window.inflow && !!document.querySelector(".workspace-topnav")');
  if (phase === 'restart') {
    const expected = ops.listArtifacts().find(item => item.id === previous.afterReload.hostRestore);
    await reader(expected); await library(expected); await reader(expected);
    const restarted = await snapshot('fresh-process-restart');
    assert.equal(restarted.reader, previous.afterReload.hostRestore);
    assert.equal(restarted.libraryTitle, expected.title);
    assert.deepEqual(restarted.vocabulary, previous.afterReload.vocabulary);
    previous.restart = restarted;
    await fs.writeFile(path.join(output, `${scenario}.json`), JSON.stringify(previous, null, 2));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS ${scenario}: restart ${expected.title}`);
    ops.close(); app.quit(); return;
  }
  const states = [];
  let expected = B, expectedHost = B, outcome;
  if (scenario === 'restore-reply') {
    await waitPending();
    await click('.workspace-topnav button', 'Library');
    await wait('document.querySelector(".workspace-library-dialog").open');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-library-item").length'), 0);
    states.push({ label: 'restoration-pending', ...await evaluate(`({reader:document.querySelector('.story-sentences')?.dataset.artifactId || null,libraryTitle:document.querySelector('.workspace-library-item[aria-current=true] strong')?.textContent || null,availableStoryChoices:document.querySelectorAll('.workspace-library-item').length})`), hostRestore: ops.restoreArtifact().id, vocabulary: ops.listVocabulary().filter(entry=>entry.contexts.length) });
    await closeLibrary('button[aria-label="Close library"]');
    pending.shift()();
    await reader(C); await library(B); await reader(B);
    outcome = 'No newer article choice is exposed while the initial list/restore Promise.all is pending; B after restoration succeeds.';
  } else {
    await reader(C); await library(C); await reader(C);
    assert.equal(await collect('before-' + scenario), C.id);
    states.push(await snapshot('before'));
    if (scenario.startsWith('ordinary-')) {
      for (let count = 0; count < 12; count++) {
        if (scenario === 'ordinary-history') {
          await evaluate(`(() => { const el=document.querySelector('select[aria-label="Open saved story"]'); for (const id of ${JSON.stringify([A.id, B.id])}) { document.querySelector('.story-options').open=true; el.value=id; el.dispatchEvent(new Event('change',{bubbles:true})); } })()`);
        } else { await library(A); await library(B); }
        await reader(B);
      }
      outcome = 'No late replacement in 12 scripted native-control A/B pairs without IPC delays; history dispatches both changes in one renderer turn, Library closes and reopens.';
    } else if (scenario === 'generation') {
      await click('.story-options summary'); await click('.story-options button', 'Generate a story');
      await wait('!!document.querySelector(".workspace-target-dialog[open]")');
      await evaluate(`document.querySelector('.workspace-target-list input').click()`);
      await click('.workspace-target-dialog button[type=submit]');
      await wait('!!document.querySelector(".story-generation-dialog[open]")');
      await evaluate(`(() => { window.orderingGenerationClosed=false; document.querySelector('.story-generation-dialog').addEventListener('close',()=>{window.orderingGenerationClosed=true;},{once:true}); })()`);
      releaseGeneration = null;
      await click('.story-generation-dialog footer button', 'Generate story');
      for (let count = 0; typeof releaseGeneration !== 'function' && count < 200; count++) await delay(25);
      assert.equal(typeof releaseGeneration, 'function');
      const unavailable = await evaluate(`(() => { const dialog=document.querySelector('.story-generation-dialog'); const button=[...document.querySelectorAll('.workspace-topnav button')].find(el=>el.textContent.startsWith('Library')); const r=button.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return {modal:dialog.matches(':modal'),closeDisabled:dialog.querySelector('[aria-label="Close generation dialog"]').disabled,libraryHitIsButton:hit===button}; })()`);
      assert.deepEqual(unavailable, { modal: true, closeDisabled: true, libraryHitIsButton: false });
      states.push({ label: 'generation-pending', ...unavailable, reader: C.id, hostRestore: ops.restoreArtifact().id });
      releaseGeneration();
      await wait('!document.querySelector(".story-generation-dialog[open]")');
      await wait('window.orderingGenerationClosed');
      expected = expectedHost = ops.listArtifacts()[0]; await reader(expected);
      outcome = 'The busy native modal blocks newer article selection; deterministic provider completion preserves a consistent reader and saved artifact.';
    } else {
      if (scenario === 'draft-reply') {
        assert.equal(await collect('pre-request-draft', false), C.id);
        const requests = trace.filter(event=>event.method==='openArtifact' && event.event==='host-complete').length;
        await history(A);
        await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
        assert.equal(trace.filter(event=>event.method==='openArtifact' && event.event==='host-complete').length, requests);
        assert.equal(ops.restoreArtifact().id, C.id);
        states.push(await snapshot('pre-request-draft-blocked'));
        await click('.vocabulary-selection button', 'Discard');
      }
      hold = { method: 'openArtifact', id: A.id };
      if (scenario === 'history-reply' || scenario === 'draft-reply') await history(A);
      else await library(A);
      await waitPending();
      states.push(await snapshot('A-host-committed-reply-held'));
      if (scenario === 'draft-reply') {
        assert.equal(await collect('edited-draft', false), C.id);
        pending.shift()();
        await wait('document.querySelector(".vocabulary-selection [role=alert]")?.textContent.includes("Save or discard")');
        expected = C; expectedHost = A;
        states.push(await snapshot('draft-blocked-late-reply'));
        await click('.vocabulary-selection button[type=submit]'); await wait('!document.querySelector(".vocabulary-selection")');
        assert.equal(ops.listVocabulary().find(entry=>entry.meaningZh==='edited-draft').contexts[0].source.artifactId, C.id);
        outcome = 'The post-await draft guard retains C and its vocabulary source, while the already executed host open has saved A.';
      } else {
        if (scenario === 'library-reply') await library(B); else await history(B);
        await reader(B); states.push(await snapshot('B-completed-before-A-reply'));
        pending.shift()(); await delay(150);
        if (scenario !== 'library-reply') expected = A;
        await reader(expected);
        outcome = scenario === 'library-reply' ? 'Library/source effect cleanup ignores A after newer Library B; host and renderer remain B.' : 'A reply replaces newer B in the renderer; the host remains B. Reply-only fixture, not an ordinary-runtime reproduction.';
      }
    }
  }
  assert.equal(await collect('after-' + scenario), expected.id);
  const after = await snapshot('after-completion'); states.push(after);
  assert.equal(after.reader, expected.id); assert.equal(after.libraryTitle, expected.title); assert.equal(after.hostRestore, expectedHost.id);
  window.webContents.reload();
  await reader(expectedHost); await library(expectedHost); await reader(expectedHost);
  const afterReload = await snapshot('renderer-reload');
  assert.equal(afterReload.hostRestore, expectedHost.id); assert.equal(afterReload.libraryTitle, expectedHost.title);
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(path.join(output, `${scenario}.json`), JSON.stringify({ scenario, outcome, ids: { A: A.id, B: B.id, C: C.id }, states, afterReload, trace, lookupInputs: lookups, errors }, null, 2));
  console.log(`PASS ${scenario}: ${outcome}`);
  ops.close(); app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
