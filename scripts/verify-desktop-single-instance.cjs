// Run after desktop:build: node scripts/verify-desktop-single-instance.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');

async function verify() {
  if (process.versions.electron) {
    const { app, BrowserWindow } = require('electron');
    app.setPath('userData', process.argv[3]);
    app.on('browser-window-created', (_event, window) => {
      window.hide();
      window.webContents.once('did-finish-load', () => {
        window.hide();
        if (process.argv[2] === 'primary') console.log('PRIMARY_READY');
        else console.log('UNEXPECTED_SECOND_WINDOW');
      });
    });
    require(path.join(root, 'build/desktop/desktop/main.js'));
    app.on('second-instance', () => {
      const windows = BrowserWindow.getAllWindows();
      console.log('PRIMARY_REUSED ' + JSON.stringify({ count: windows.length, visible: windows[0]?.isVisible(), minimized: windows[0]?.isMinimized() }));
    });
    return;
  }

  const outputRoot = path.join(root, '.scratch/desktop-learning/generated-samples');
  await fs.mkdir(outputRoot, { recursive: true });
  const output = await fs.mkdtemp(path.join(outputRoot, 'single-instance-'));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const children = [];
  let errors = '';
  const launch = phase => {
    const child = spawn(require('electron'), [__filename, phase, path.join(output, 'profile')], { cwd: root, env, windowsHide: true });
    child.stderr.on('data', data => { errors += `[${phase}] ${data.toString()}`; });
    children.push(child);
    return child;
  };
  try {
    const first = launch('primary');
    let notification = '';
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Primary desktop did not load')), 15000);
      first.stdout.on('data', data => {
        notification += data.toString();
        if (notification.includes('PRIMARY_READY')) { clearTimeout(timer); resolve(); }
      });
    });
    const second = launch('secondary');
    const [code] = await once(second, 'close', { signal: AbortSignal.timeout(5000) });
    assert.equal(code, 0, 'Repeated launch must exit successfully');
    const reused = JSON.parse(notification.match(/PRIMARY_REUSED (.+)/)?.[1] || '{}');
    assert.equal(reused.count, 1, 'Repeated launch must reuse the first window');
    assert.equal(reused.visible, true, 'Repeated launch must show the existing hidden window');
    assert.equal(reused.minimized, false, 'Repeated launch must restore the existing window');
    assert.doesNotMatch(errors, /Unable to move the cache|Unable to create cache|Gpu Cache Creation failed/);
    console.log('PASS: repeated desktop launch shows one window without cache errors');
  } finally {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const closed = once(child, 'close');
        child.kill();
        await closed;
      }
    }
    await fs.writeFile(path.join(output, 'stderr.log'), errors);
    console.log('Desktop evidence: ' + output);
    if (errors) console.error(errors);
  }
}

verify().catch(error => {
  console.error(error);
  if (process.versions.electron) require('electron').app.exit(1);
  else process.exitCode = 1;
});
