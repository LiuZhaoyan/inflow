/* eslint @typescript-eslint/no-require-imports: off -- Native regression process supervision. */
const { execFileSync, spawn } = require('node:child_process');
const path = require('node:path');

function runNode(args, timeout = 180_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: path.resolve(__dirname, '../..'), stdio: 'inherit', windowsHide: true,
      detached: process.platform !== 'win32',
    });
    let failure;
    const timer = setTimeout(() => {
      failure = new Error(`Native regression timed out after ${timeout} ms: ${args.join(' ')}`);
      try {
        if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
        else process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        failure.cause = error;
        child.kill('SIGKILL');
      }
    }, timeout);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code === 0) resolve();
      else reject(new Error(`Native regression exited ${code ?? signal}: ${args.join(' ')}`));
    });
  });
}

module.exports = { runNode };
