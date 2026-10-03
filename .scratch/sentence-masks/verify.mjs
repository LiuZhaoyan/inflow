// Run against npm run dev. Reuse the existing media fixture and cached browser.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { openSync, closeSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'build/sentence-mask-verification');
await mkdir(output, { recursive: true });
const cli = process.env.AGENT_BROWSER_CLI || 'C:/Users/123/AppData/Local/npm-cache/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser.js';
const fixture = path.join(output, 'fixture.js');
const extension = `(() => {
  // The development-only Next badge otherwise covers Previous at the viewport edge.
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal { display: none !important; }';
    document.head.appendChild(style);
  }, { once: true });
  const api = window.__inflowAcceptance, bridge = window.inflow;
  const key = 'inflow-mask-verification', entries = [];
  const decorate = media => {
    media.language = 'ko';
    media.segments[1].groups = ['저는', '도서관에서', '공부해요.'];
    return media;
  };
  bridge.restore = async () => {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const media = decorate(api.media(saved?.id || 'completed'));
    if (saved) media.learning = saved.learning;
    return media;
  };
  const open = bridge.open, save = bridge.saveLearning;
  bridge.open = async id => decorate(await open(id));
  bridge.saveLearning = async (id, learning) => {
    await save(id, learning);
    localStorage.setItem(key, JSON.stringify({ id, learning }));
  };
  bridge.lookupVocabulary = async input => {
    window.__maskLookup = input;
    return { surface: input.surface, lemma: input.surface, language: 'ko', candidates: ['测试释义'], meaningZh: '测试释义' };
  };
  bridge.listVocabulary = async () => entries;
  bridge.saveVocabulary = async input => {
    const entry = { id: 'mask-word-' + entries.length, ...input, selected: false, contexts: [{ id: 'context', ...input.context }] };
    entries.push(entry); window.__maskSavedWord = entry; return entry;
  };
})();`;
await writeFile(fixture, await readFile(path.join(root, '.scratch/frontend-workspace/fixture.js'), 'utf8') + '\n' + extension);
const env = { ...process.env, AGENT_BROWSER_EXECUTABLE_PATH: process.env.AGENT_BROWSER_EXECUTABLE_PATH || 'C:/Users/123/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' };
const args = ['--json', '--session', 'inflow-mask-verification', '--init-script', fixture];
const run = commands => {
  const stdout = path.join(output, 'browser-output.json'), stderr = path.join(output, 'browser-errors.txt');
  const handles = [openSync(stdout, 'w'), openSync(stderr, 'w')];
  try {
    execFileSync(process.execPath, [cli, ...args, 'batch', '--bail', ...commands], { env, stdio: ['ignore', ...handles], timeout: 120_000 });
  } catch (error) { if (error.status !== 1) throw error; }
  finally { handles.forEach(closeSync); }
  const raw = readFileSync(stdout, 'utf8');
  const results = JSON.parse(raw.trim());
  assert.ok(results.every(result => result.success), results.find(result => !result.success)?.error);
  return results;
};
const ev = body => 'eval -b ' + Buffer.from(`(async () => {
  const check = (value, message) => { if (!value) throw Error(message); };
  const until = async test => { for (let i = 0; i < 100; i++) { if (test()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Timed out: ' + test); };
  ${body}
})()`).toString('base64');
const image = name => 'screenshot ' + path.join(output, name).replaceAll('\\', '/');
const target = (command, selector, value) => command + ' ' + JSON.stringify(selector) + (value ? ' ' + JSON.stringify(value) : '');
try {
  // Verify page loading before beginning the interaction checks.
  const initial = run([
    'open http://localhost:3000',
    ev("localStorage.removeItem('inflow-mask-verification');"), 'reload',
    'wait .workspace-group-text', 'set viewport 1440 960', 'snapshot -i',
    ev("check(document.body.innerText.length > 0 && !document.querySelector('[data-nextjs-dialog]'), 'Blank page or framework error'); check(document.querySelectorAll('.workspace-group-text').length === 3, 'New sentence must start visible'); return 'Page loads with visible sentence and mask control';"),
    image('initial.png'),
  ]);
  console.log('Page verified: visible sentence, mask control, no framework overlay.');
  const result = run([
    target('focus', '.workspace-mask-toggle'), 'press Enter', 'wait .workspace-mask-group',
    ev("window.__maskGeometry = [...document.querySelectorAll('.workspace-mask-text')].map(group => { const { x, y, width, height } = group.getBoundingClientRect(); return { x, y, width, height }; });"),
    target('focus', '[data-source-start="0"] .workspace-mask-group'), 'press Enter',
    ev("check(document.querySelector('.workspace-sentence-area.is-masking') && document.querySelectorAll('.hidden-group').length === 1, 'Group must hide immediately without exiting mask mode'); const group = document.querySelector('[data-source-start=\"0\"] .workspace-mask-group'); const text = group.querySelector('.workspace-mask-text'); check(getComputedStyle(text).visibility === 'hidden' && text.getAttribute('aria-hidden') === 'true' && !group.getAttribute('aria-label').includes('저는'), 'Mask must conceal source text and its accessible label'); const bounds = text.getBoundingClientRect(), original = window.__maskGeometry[0]; check(['x', 'y', 'width', 'height'].every(key => Math.abs(bounds[key] - original[key]) < 0.5), 'Mask must preserve the exact original text width and position'); group.click(); await until(() => !document.querySelector('.hidden-group')); check(document.querySelector('.workspace-sentence-area.is-masking') && group.textContent === '저는', 'Clicking the mask must immediately show the group in the same mode'); check(document.querySelector('.workspace-mask-toggle').textContent.trim() === 'Set masks', 'One unchanged button toggles the mode'); return 'Live hide/show without a selection or confirmation step';"),
    // The buttons live in separate spans; select the last group explicitly.
    ev("const groups = document.querySelectorAll('.workspace-mask-group'); if (groups[0].getAttribute('aria-pressed') !== 'true') groups[0].click(); groups[2].click(); await until(() => document.querySelectorAll('.workspace-mask-group[aria-pressed=true]').length === 2); const node = groups[1].firstChild, range = document.createRange(); range.selectNodeContents(node); getSelection().removeAllRanges(); getSelection().addRange(range); await new Promise(resolve => setTimeout(resolve, 250)); check(!document.querySelector('.vocabulary-selection'), 'Collection must be disabled during mask setup'); [...document.querySelectorAll('.workspace-mask-text')].forEach((group, index) => { const bounds = group.getBoundingClientRect(), original = window.__maskGeometry[index]; check(['x', 'y', 'width', 'height'].every(key => Math.abs(bounds[key] - original[key]) < 0.5), 'Nonconsecutive masks must preserve every group position and width'); }); return 'Keyboard setup and nonconsecutive masks';"),
    image('mask-mode.png'), 'click .workspace-mask-toggle',
    ev("await until(() => !document.querySelector('.workspace-sentence-area.is-masking')); check(!document.querySelector('.hidden-group') && document.querySelectorAll('.workspace-group-text').length === 3, 'Exiting mask mode must show all groups'); check([...document.querySelectorAll('.workspace-group-text')].map(group => group.textContent).join(' ') === '저는 도서관에서 공부해요.', 'Full sentence must be restored'); check(JSON.stringify(window.__inflowAcceptance.stats.latestLearning.completed.masks['completed-sentence-2']) === '[0,2]', 'Persist nonconsecutive mask choices'); return 'Exiting mode shows the full sentence and retains saved choices';"),
    image('practice.png'),
    target('dblclick', '[data-source-start="0"] .workspace-group-text'), target('wait', '.vocabulary-selection input[name=meaningZh]'),
    ev("check(window.__maskLookup.start === 0 && window.__maskLookup.surface === '저는', 'Previously masked word must keep its source offset'); return 'Word collection enabled immediately after leaving mask mode';"),
    target('fill', '.vocabulary-selection input[name=meaningZh]', 'verified-meaning'), 'click .workspace-mask-toggle',
    ev("check(!document.querySelector('.workspace-sentence-area.is-masking') && document.querySelector('.vocabulary-selection input[name=meaningZh]').value === 'verified-meaning', 'Edited vocabulary draft must block mode changes'); return 'Unsaved word protected';"),
    ev("document.querySelector('.vocabulary-selection button[type=submit]').click(); await until(() => !document.querySelector('.vocabulary-selection')); check(window.__maskSavedWord.contexts[0].surfaceStart === 0, 'Collected occurrence must retain its source offset'); return 'Previously masked word saved';"),
    target('dblclick', '[data-source-start="3"] .workspace-group-text'), target('wait', '.vocabulary-selection input[name=meaningZh]'),
    ev("check(window.__maskLookup.start === 3 && window.__maskLookup.surface === '도서관에서', 'Middle group must keep its original offset'); [...document.querySelectorAll('.vocabulary-selection button')].find(button => button.textContent === 'Discard').click(); return 'Original source offsets preserved';"),
    target('click', '[aria-label="Show Chinese translation"]'), 'wait .workspace-translation',
    target('click', '[aria-label="Next sentence"]'),
    ev("await until(() => document.querySelector('.workspace-sentence-count').textContent.includes('03')); check(!document.querySelector('.workspace-translation') && !document.querySelector('.hidden-group'), 'Sentence navigation resets translation; unconfigured sentence stays visible'); return 'Sentence navigation';"),
    target('click', '[aria-label="Previous sentence"]'),
    ev("await until(() => document.querySelector('.workspace-sentence-count').textContent.includes('02')); check(!document.querySelector('.hidden-group') && document.querySelectorAll('.workspace-group-text').length === 3, 'Returning to a sentence must show its full text'); return 'Sentence return shows full text';"),
    'click .workspace-mask-toggle',
    ev("await until(() => document.querySelectorAll('.hidden-group').length === 2); check(document.querySelector('.workspace-sentence-area.is-masking'), 'Saved masks apply only after entering mask mode'); return 'Re-entering mode restores saved masks';"),
    'click .workspace-mask-toggle', 'reload', 'wait .workspace-group-text',
    ev("check(!document.querySelector('.hidden-group') && document.querySelectorAll('.workspace-group-text').length === 3 && !document.querySelector('.workspace-sentence-area.is-masking'), 'Reopening starts with full source text and mask mode off'); return 'Renderer reload starts with all groups visible';"),
    'click .workspace-mask-toggle',
    ev("await until(() => document.querySelectorAll('.hidden-group').length === 2); return 'Saved choices persist across renderer reload';"),
    'click .workspace-mask-toggle',
    'set viewport 480 800', image('practice-480.png'),
    ev("check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Narrow viewport must not overflow horizontally'); return '480px layout has no horizontal overflow';"),
    'set viewport 1440 960',
    ev("document.querySelector('nav button[aria-haspopup=dialog]').click(); await until(() => document.querySelector('dialog[open]')); [...document.querySelectorAll('.workspace-library-item')].find(button => button.textContent.includes('missing.wav')).click(); await until(() => document.querySelector('.workspace-sentence-count').textContent.includes('01'));"),
    'click .workspace-mask-toggle', target('click', '[data-source-start="0"] .workspace-mask-group'), 'click .workspace-mask-toggle',
    ev("await until(() => !!window.__inflowAcceptance.stats.latestLearning.missing?.masks); check(!document.querySelector('.hidden-group') && document.querySelector('.workspace-group-text'), 'Missing-media transcript must be visible outside mask mode'); return 'Mask saved while media is missing';"),
    'reload', 'wait .workspace-group-text',
    ev("check(!document.querySelector('.hidden-group') && document.querySelector('.workspace-status').textContent.includes('missing.wav'), 'Missing-media transcript must reopen fully visible'); check(!document.querySelector('[data-nextjs-dialog]'), 'No framework overlay'); return 'Missing-media transcript reopens fully visible';"),
    'click .workspace-mask-toggle',
    ev("await until(() => document.querySelectorAll('.hidden-group').length === 1); return 'Missing-media masks restored on mode entry';"),
    'click .workspace-mask-toggle',
    ev("document.querySelector('nav button[aria-haspopup=dialog]').click(); await until(() => document.querySelector('dialog[open]')); [...document.querySelectorAll('.workspace-library-item')].find(button => button.textContent.includes('overlong.wav')).click(); await until(() => document.querySelector('.workspace-status').textContent.includes('overlong.wav'));"),
    'click .workspace-mask-toggle', target('click', '[data-source-start="0"] .workspace-mask-group'), 'click .workspace-mask-toggle',
    ev("await until(() => !!window.__inflowAcceptance.stats.latestLearning.overlong?.masks); check(document.querySelector('[aria-label=Play]').disabled && !document.querySelector('.hidden-group') && document.querySelector('.workspace-group-text'), 'Overlong-media transcript must be visible outside mask mode without enabling playback'); return 'Legacy overlong-media masks saved';"),
    'reload', 'wait .workspace-group-text',
    ev("check(!document.querySelector('.hidden-group') && document.querySelector('[aria-label=Play]').disabled, 'Overlong-media transcript reopens fully visible while playback stays disabled'); return 'Legacy transcript reopens fully visible';"),
    'click .workspace-mask-toggle',
    ev("await until(() => document.querySelectorAll('.hidden-group').length === 1); check(document.querySelector('[aria-label=Play]').disabled, 'Mode entry must not enable overlong-media playback'); return 'Legacy masks restored only in mask mode';"),
    'click .workspace-mask-toggle',
    'errors',
  ]);
  assert.deepEqual(result.at(-1).result.errors, []);
  await writeFile(path.join(output, 'evidence.json'), JSON.stringify({ initial, result }, null, 2));
  console.log(result.map(step => step.result?.result).filter(value => typeof value === 'string').join('\n'));
} catch (error) {
  process.stderr.write(String(error.stdout ?? '').slice(-4000));
  throw error;
} finally {
  execFileSync(process.execPath, [cli, '--session', 'inflow-mask-verification', 'close'], { env, stdio: 'ignore', timeout: 30_000 });
}
