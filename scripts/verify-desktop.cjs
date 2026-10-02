// Native development verification. Dialog selection is supplied deterministically; media decoding and model execution are real.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');

async function run() {
  if (!process.versions.electron) {
    const vocabulary = process.argv[2] === '--vocabulary';
    const artifacts = process.argv[2] === '--artifacts';
    const resumeArtifacts = process.argv[2] === '--resume-artifacts';
    const source = vocabulary || artifacts || resumeArtifacts ? process.argv[3] : process.argv[2];
    if (!source) throw new Error('Usage: node scripts/verify-desktop.cjs <representative Korean media>');
    const output = resumeArtifacts ? path.resolve(source) : await fs.mkdtemp(path.join(root, '.scratch/desktop-learning/generated-samples/desktop-acceptance-'));
    if (resumeArtifacts) await fs.access(path.join(output, 'expected-artifacts.json'));
    else if (vocabulary || artifacts) await fs.cp(source, path.join(output, 'profile'), { recursive: true });
    else await fs.copyFile(source, path.join(output, '韩语 sample' + path.extname(source)));
    for (const phase of resumeArtifacts ? ['artifacts-reopen'] : artifacts ? ['artifacts', 'artifacts-reopen'] : vocabulary ? ['vocabulary', 'vocabulary-reopen'] : ['first', 'reopen', 'missing']) {
      await new Promise((resolve, reject) => {
        const env = { ...process.env };
        delete env.ELECTRON_RUN_AS_NODE;
        const child = spawn(require('electron'), [__filename, phase, output, vocabulary || artifacts || resumeArtifacts ? '.webm' : path.extname(source)], { stdio: 'inherit', env });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}`)));
      });
      await fs.access(path.join(output, phase + '.json'));
    }
    console.log('Desktop evidence: ' + output);
    return;
  }

  const { app, BrowserWindow, dialog } = require('electron');
  const phase = process.argv[2];
  const output = process.argv[3];
  const source = path.join(output, '韩语 sample' + process.argv[4]);
  app.setPath('userData', path.join(output, 'profile'));
  if (phase === 'artifacts-reopen') global.fetch = async () => { throw new Error('Reopening must not contact the generation provider'); };
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] });
  const errors = [];
  app.on('browser-window-created', (_event, window) => {
    window.hide();
    window.webContents.setBackgroundThrottling(false);
    window.webContents.once('did-finish-load', () => window.hide());
    window.webContents.on('console-message', event => { if (event.level === 'error') { errors.push(event.message); console.error(event.message); } });
  });
  require(path.join(root, 'build/desktop/desktop/main.js'));
  await app.whenReady();
  const window = BrowserWindow.getAllWindows()[0] || await new Promise(resolve => app.once('browser-window-created', (_event, created) => resolve(created)));
  assert.ok(window);
  const evaluate = expression => window.webContents.executeJavaScript('{\n' + expression + '\n}', true);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(expression, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return;
      await delay(200);
    }
    throw new Error('Timed out: ' + expression);
  }
  await wait('!!window.inflow && !!document.querySelector(".desktop-import")');
  const click = text => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim().includes(${JSON.stringify(text)}))?.click()`);
  const snapshot = () => evaluate(`({ url: location.href, count: document.querySelectorAll('.segment-list button').length, sentence: document.querySelector('.sentence-meta').textContent, rate: document.querySelector('[aria-label="播放倍速"]').value, loop: document.querySelector('.tools button').getAttribute('aria-pressed'), currentTime: document.querySelector('video')?.currentTime, duration: document.querySelector('video')?.duration, decodedFrames: document.querySelector('video')?.webkitDecodedFrameCount, videoWidth: document.querySelector('video')?.videoWidth, errors: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent), sourceHidden: !document.querySelector('.meaning-group'), translationHidden: !document.querySelector('.translation.expanded') })`);
  let evidence = { phase, electron: process.versions.electron, node: process.versions.node };
  if (phase === 'artifacts' || phase === 'artifacts-reopen') {
    await wait('!!document.querySelector("#artifacts") && document.querySelectorAll(".vocabulary-entry").length >= 3');
    await wait('document.querySelector(".generation-credential summary").textContent.includes("已配置")');
    assert.equal((await evaluate('window.inflow.credentialStatus()')).configured, true);
    const readArtifacts = () => evaluate('window.inflow.listArtifacts()');
    if (phase === 'artifacts') {
      assert.deepEqual(await readArtifacts(), []);
      const field = (selector, value) => evaluate(`const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true }));`);
      await field('[name=topic]', '친구와 타이완 여행');
      await click('生成短文');
      await wait('!!document.querySelector(".artifact-reader")', 100000);
      const first = (await readArtifacts())[0];
      assert.equal(first.targets.length, 2);
      assert.equal(await evaluate('document.querySelectorAll(".artifact-translation").length'), 0);
      assert.ok(await evaluate('document.querySelectorAll(".artifact-korean mark").length >= 2'));
      await click('显示短文翻译');
      assert.equal(await evaluate('document.querySelectorAll(".artifact-translation").length'), first.sentences.length);
      const candidates = [['친구', '朋友'], ['여행', '旅行'], ['바다', '大海'], ['항구', '港口'], ['사진', '照片'], ['아침', '早晨'], ['사람', '人']];
      let found;
      for (const [surface, meaning] of candidates) {
        const index = first.sentences.findIndex(sentence => sentence.parts.some(part => !part.targetId && part.text.includes(surface)));
        if (index >= 0) { found = { surface, meaning, index }; break; }
      }
      assert.ok(found, 'The real passage needs a common supporting word for the second collection');
      await evaluate(`const p = document.getElementById('artifact-sentence-${found.index}'); const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const offset = node.textContent.indexOf(${JSON.stringify(found.surface)}); if (offset >= 0) { const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + ${found.surface.length}); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); break; } } document.querySelectorAll('.artifact-sentence button')[${found.index}].click();`);
      await wait('!!document.querySelector(".vocabulary-editor")');
      await field('.vocabulary-editor [name=lemma]', found.surface);
      await field('.vocabulary-editor [name=meaningZh]', found.meaning);
      await click('保存词汇'); await wait('!document.querySelector(".vocabulary-editor")');
      let entries = await evaluate('window.inflow.listVocabulary()');
      const collected = entries.find(entry => entry.lemma === found.surface && entry.meaningZh === found.meaning);
      assert.ok(collected); assert.equal(collected.contexts[0].source.artifactId, first.id);
      assert.equal(collected.contexts[0].sentence, first.sentences[found.index].parts.map(part => part.text).join(''));
      const oldTarget = first.targets[0];
      await evaluate(`document.querySelector('[data-entry-id="${oldTarget.id}"] button').click()`);
      await wait('!!document.querySelector(".vocabulary-editor")');
      await field('.vocabulary-editor [name=meaningZh]', oldTarget.meaningZh + '（复习用）');
      await click('保存词汇'); await wait('!document.querySelector(".vocabulary-editor")');
      assert.equal((await evaluate(`window.inflow.openArtifact('${first.id}')`)).targets[0].meaningZh, oldTarget.meaningZh);
      entries = await evaluate('window.inflow.listVocabulary()');
      for (const entry of entries.filter(entry => entry.selected).concat(collected)) {
        await evaluate(`document.querySelector('[data-entry-id="${entry.id}"] input[type=checkbox]').click()`);
        await wait('!document.querySelector(".vocabulary-target input:disabled")');
      }
      await evaluate(`document.querySelector('[data-entry-id="${collected.id}"] details').open = true; document.querySelector('[data-entry-id="${collected.id}"] .vocabulary-source').click()`);
      await wait('document.querySelectorAll(".artifact-translation").length === 0');
      await field('[name=topic]', ''); await click('生成短文');
      await wait('document.querySelectorAll(".artifact-selector option").length === 2', 100000);
      const second = (await readArtifacts())[0];
      assert.notEqual(second.id, first.id); assert.equal(second.targets.length, 1);
      assert.equal(second.targets[0].id, collected.id); assert.equal(second.topic, undefined);
      assert.equal(second.targets[0].sourceSentence, collected.contexts[0].sentence);
      await fs.writeFile(path.join(output, 'expected-artifacts.json'), JSON.stringify(await readArtifacts(), null, 2));
      await fs.writeFile(path.join(output, 'expected-artifact-vocabulary.json'), JSON.stringify(await evaluate('window.inflow.listVocabulary()'), null, 2));
      const { GenerationCredential } = require(path.join(root, 'build/desktop/desktop/credentials.js'));
      const credentialDir = path.join(output, 'credential-check'); await fs.mkdir(credentialDir);
      const credential = new GenerationCredential(credentialDir);
      await credential.configure('verification-only-key');
      assert.equal((await fs.readFile(path.join(credentialDir, 'deepseek.key'))).includes(Buffer.from('verification-only-key')), false);
      const restoredCredential = new GenerationCredential(credentialDir); await restoredCredential.initialize(credentialDir);
      assert.equal(restoredCredential.get(), 'verification-only-key');
      await assert.rejects(credential.configure('invalid\nkey'));
      assert.equal(credential.get(), 'verification-only-key');
      evidence.windowsCredentialRoundtrip = true;
    } else {
      await wait('document.querySelectorAll(".artifact-selector option").length === 2 && !!document.querySelector(".artifact-reader")');
      assert.deepEqual(await readArtifacts(), JSON.parse(await fs.readFile(path.join(output, 'expected-artifacts.json'), 'utf8')));
      assert.deepEqual(await evaluate('window.inflow.listVocabulary()'), JSON.parse(await fs.readFile(path.join(output, 'expected-artifact-vocabulary.json'), 'utf8')));
      const items = await readArtifacts();
      assert.equal(await evaluate('document.querySelector(".artifact-reader").dataset.artifactId'), (await evaluate('window.inflow.restoreArtifact()')).id);
      await evaluate(`const select = document.querySelector('.artifact-selector select'); select.value = '${items[1].id}'; select.dispatchEvent(new Event('change', {bubbles:true}));`);
      await wait(`document.querySelector('.artifact-reader').dataset.artifactId === '${items[1].id}'`);
      assert.equal(await evaluate('document.querySelectorAll(".artifact-translation").length'), 0);
      const entries = await evaluate('window.inflow.listVocabulary()');
      const collected = entries.find(entry => entry.contexts.some(context => context.source.type === 'artifact' && context.source.artifactId === items[1].id));
      for (let attempt = 0; attempt < 2; attempt++) {
        await evaluate(`const select = document.querySelector('.artifact-selector select'); select.value = '${items[0].id}'; select.dispatchEvent(new Event('change', {bubbles:true}));`);
        await wait(`document.querySelector('.artifact-reader').dataset.artifactId === '${items[0].id}'`);
        await evaluate(`document.querySelector('[data-entry-id="${collected.id}"] details').open = true; document.querySelector('[data-entry-id="${collected.id}"] .vocabulary-source').click()`);
        await wait(`document.querySelector('.artifact-reader').dataset.artifactId === '${items[1].id}'`);
      }
      global.fetch = async () => new Response('private-provider-body', { status: 429 });
      await click('生成短文');
      await wait('Array.from(document.querySelectorAll("[role=alert]")).some(el => el.textContent.includes("余额、额度"))');
      assert.deepEqual(await readArtifacts(), items);
      global.fetch = async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }));
      await click('生成短文');
      await wait('Array.from(document.querySelectorAll("button")).some(el => el.textContent === "取消生成")');
      await click('取消生成');
      await wait('Array.from(document.querySelectorAll("[role=alert]")).some(el => el.textContent.includes("已取消"))');
      assert.deepEqual(await readArtifacts(), items);
      assert.deepEqual(await evaluate('window.inflow.listVocabulary()'), entries);
      await evaluate(`const select = document.querySelector('.artifact-selector select'); select.value = '${items[1].id}'; select.dispatchEvent(new Event('change', {bubbles:true}));`);
      await wait('document.querySelectorAll("[role=alert]").length === 0');
      global.fetch = async () => { throw new Error('Reopening must not contact the generation provider'); };
      evidence.simulatedQuotaAndCancellationPreservedWork = true;
      evidence.offlineReopen = true;
    }
    evidence.artifacts = await readArtifacts(); evidence.vocabulary = await evaluate('window.inflow.listVocabulary()');
    evidence.activeArtifactId = (await evaluate('window.inflow.restoreArtifact()')).id;
    await evaluate('document.querySelector(".artifact-targets").open = true; document.querySelector("#artifacts").scrollIntoView({block:"start",behavior:"instant"})');
    await delay(200);
  } else if (phase === 'vocabulary' || phase === 'vocabulary-reopen') {
    await wait('!!document.querySelector("#notebook") && document.querySelectorAll(".segment-list button").length === 33');
    const readEntries = () => evaluate('window.inflow.listVocabulary()');
    if (phase === 'vocabulary') {
      assert.deepEqual(await readEntries(), []);
      const field = (name, value) => evaluate(`const input = document.querySelector('.vocabulary-editor [name=${JSON.stringify(name)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true }));`);
      async function save(lemma, meaning) {
        await field('lemma', lemma); await field('meaningZh', meaning);
        await click('保存词汇'); await wait('!document.querySelector(".vocabulary-editor")');
      }
      async function collect(index) {
        await evaluate(`document.querySelectorAll('.segment-list button')[${index}].click()`);
        await evaluate('document.querySelector(".reveal-trigger").click()');
        await wait('!!document.querySelector("[data-reveal-option=all]")');
        await evaluate('document.querySelector("[data-reveal-option=all]").click()');
        if (index === 1) {
          await evaluate(`const range = document.createRange(); range.selectNodeContents(document.querySelector('#notebook h2')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);`);
          await click('收藏选中文字');
          await wait('Array.from(document.querySelectorAll("[role=alert]")).some(el => el.textContent.includes("请在已揭晓"))');
          assert.equal(await evaluate('!!document.querySelector(".vocabulary-editor")'), false);
          assert.deepEqual(await readEntries(), []);
        }
        await evaluate(`const node = [...document.querySelectorAll('.transcript .meaning-group')].find(el => el.textContent.includes('대만을')).firstChild; const offset = node.textContent.indexOf('대만을'); const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 3); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);`);
        await click('收藏选中文字'); await wait('!!document.querySelector(".vocabulary-editor")');
        assert.equal(await evaluate('document.querySelector(".vocabulary-context strong").textContent'), '대만을');
      }
      await collect(1); await save('대만', '台湾');
      const first = (await readEntries())[0];
      assert.equal(first.contexts[0].surface, '대만을');
      await collect(2); await save('대만', '台湾');
      const added = (await readEntries())[0];
      assert.equal(added.id, first.id); assert.equal(added.contexts.length, 2); assert.deepEqual(added.contexts[0], first.contexts[0]);
      await evaluate(`document.querySelector('[data-entry-id="${first.id}"] button').click()`);
      await wait('!!document.querySelector(".vocabulary-editor")');
      await save('타이완', '台湾（地名）');
      for (const meaning of ['船', '肚子']) {
        await click('手动添加'); await wait('!!document.querySelector(".vocabulary-editor")');
        assert.equal(await evaluate('!!document.querySelector(".vocabulary-editor .vocabulary-context")'), false);
        await save('배', meaning);
      }
      let entries = await readEntries();
      assert.equal(entries.length, 3);
      assert.equal(entries.filter(entry => entry.lemma === '배').length, 2);
      assert.equal(entries.find(entry => entry.meaningZh === '船').contexts.length, 0);
      for (const entry of [entries.find(entry => entry.id === first.id), entries.find(entry => entry.meaningZh === '船')]) {
        await evaluate(`document.querySelector('[data-entry-id="${entry.id}"] input[type=checkbox]').click()`);
        await wait('!document.querySelector(".vocabulary-target input:disabled")');
      }
      entries = await readEntries();
      assert.equal(entries.filter(entry => entry.selected).length, 2);
      assert.equal(entries.find(entry => entry.id === first.id).lemma, '타이완');
      await evaluate(`document.querySelector('[data-entry-id="${first.id}"] details').open = true; document.querySelector('[data-entry-id="${first.id}"] .vocabulary-source').click()`);
      await wait('document.querySelector(".sentence-meta").textContent.includes("第 2 / 33")');
      assert.equal((await snapshot()).sourceHidden, true);
      await fs.writeFile(path.join(output, 'expected-vocabulary.json'), JSON.stringify(entries, null, 2));
    } else {
      await wait('document.querySelectorAll(".vocabulary-entry").length === 3');
      assert.deepEqual(await readEntries(), JSON.parse(await fs.readFile(path.join(output, 'expected-vocabulary.json'), 'utf8')));
      assert.equal(await evaluate('document.querySelectorAll(".vocabulary-target input:checked").length'), 2);
      assert.equal((await snapshot()).sourceHidden, true);
    }
    evidence.vocabulary = await readEntries();
    await evaluate('document.querySelectorAll(".vocabulary-entry details").forEach(el => el.open = true); document.querySelector("#notebook").scrollIntoView({block:"start",behavior:"instant"})');
    await delay(200);
  } else if (phase === 'first') {
    await evaluate('document.querySelector(".desktop-import").click()');
    await wait('document.querySelector("video")?.readyState >= 1');
    await fs.rm(source);
    await evaluate('document.querySelector("video").play()');
    await wait('document.querySelector("video").currentTime > 0.3');
    await evaluate('document.querySelector("video").pause()');
    const started = Date.now();
    await click('开始处理');
    await wait('document.querySelectorAll(".segment-list button").length > 0', 180000);
    evidence.processingMs = Date.now() - started;
    await wait('!document.querySelector(".import-status .process-button").disabled');
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await evaluate(`const select = document.querySelector('[aria-label="播放倍速"]'); select.value = '1.5'; select.dispatchEvent(new Event('change', { bubbles: true }));`);
    await click('循环');
    await evaluate('document.querySelector(".play-button").click()');
    await delay(3200);
    evidence.loopPlayback = await snapshot();
    await fs.writeFile(path.join(output, 'playback-check.json'), JSON.stringify(evidence, null, 2));
    assert.ok(evidence.loopPlayback.currentTime >= 18.78 && evidence.loopPlayback.currentTime <= 20.3);
    await evaluate('document.querySelector("video").pause()');
    await evaluate('document.querySelector(".reveal-trigger").click()');
    await wait('!!document.querySelector("[data-reveal-option=all]")');
    await evaluate('document.querySelector("[data-reveal-option=all]").click()');
    assert.equal((await snapshot()).sourceHidden, false);
    await click('隐藏原文');
    await click('翻译');
    await wait('document.querySelector(".translation.expanded p")?.textContent.includes("4")', 30000);
    evidence.translation = await evaluate('document.querySelector(".translation.expanded p").textContent');
    assert.equal((await snapshot()).sourceHidden, true);
    await evaluate('document.querySelectorAll(".segment-list button")[5].click()');
    assert.equal((await snapshot()).translationHidden, true);
    await click('重新处理');
    await wait('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "取消处理")');
    await delay(1500);
    await click('取消处理');
    await delay(800);
    assert.equal((await snapshot()).count, 33);
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await delay(500);
    const saved = await evaluate('window.inflow.restore()');
    evidence.saved = saved;
    await fs.writeFile(path.join(output, 'expected.json'), JSON.stringify(saved, null, 2));
    await fs.copyFile(path.join(output, 'profile/media', saved.id + process.argv[4]), source);
  } else if (phase === 'reopen') {
    await wait('document.querySelectorAll(".segment-list button").length === 33 && document.querySelector("video")?.readyState >= 1');
    const expected = JSON.parse(await fs.readFile(path.join(output, 'expected.json'), 'utf8'));
    const restored = await evaluate('window.inflow.restore()');
    assert.deepEqual(restored.segments, expected.segments);
    assert.deepEqual(restored.learning, expected.learning);
    assert.equal(restored.id, expected.id);
    const state = await snapshot();
    assert.equal(state.rate, '1.5'); assert.equal(state.loop, 'true');
    assert.ok(Math.abs(state.currentTime - expected.learning.position) < 0.1);
    assert.equal(state.sourceHidden, true); assert.equal(state.translationHidden, true);
    const response = await evaluate(`fetch(document.querySelector('video').src, {headers:{Range:'bytes=0-1023'}}).then(async r => ({status:r.status, bytes:(await r.arrayBuffer()).byteLength}))`);
    evidence.range = response;
    assert.equal(response.status, 206); assert.equal(response.bytes, 1024);
    await evaluate('document.querySelector("video").play()');
    await wait('document.querySelector("video").webkitDecodedFrameCount > 0');
    await evaluate('document.querySelector("video").pause()');
    await evaluate('document.querySelectorAll(".segment-list button")[4].click()');
    await wait('document.querySelector("video").readyState >= 2 && !document.querySelector("video").seeking');
    await fs.rm(path.join(output, 'profile/media', restored.id + process.argv[4]));
  } else {
    await wait('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "重新关联媒体")');
    assert.equal((await snapshot()).count, 33);
    await click('重新关联媒体');
    await wait('document.querySelector("video")?.readyState >= 1');
    assert.equal((await snapshot()).count, 33);
    await evaluate(`location.hash = 'library'`);
    assert.equal((await evaluate('window.inflow.list()')).length, 1);
  }
  evidence.ui = await snapshot(); evidence.consoleErrors = errors;
  assert.deepEqual(evidence.ui.errors, []); assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify(evidence, null, 2));
  const capture = await Promise.race([window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true }), delay(10000).then(() => { throw new Error('Native screenshot timed out'); })]);
  await fs.writeFile(path.join(output, `${phase}.png`), capture.toPNG());
  console.log('Verified desktop phase: ' + phase);
  app.quit();
}
run().catch(error => { console.error(error); if (process.versions.electron) require('electron').app.exit(1); else process.exitCode = 1; });
