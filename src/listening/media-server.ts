import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

export async function readBody(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('文件或请求过大，请选择 50 MB 以内的媒体。');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请求内容为空。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('文件或请求过大，请选择 50 MB 以内的媒体。'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

function processorPaths(root: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  return {
    python: env.INFLOW_PYTHON || paths.join(root, '.venv', ...(platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'])),
    worker: paths.join(root, 'scripts', 'media_processor.py'),
    models: env.INFLOW_MODELS_DIR
      ? paths.resolve(root, env.INFLOW_MODELS_DIR)
      : paths.join(root, '.models'),
  };
}

// ponytail: one local inference at a time; use a bounded job queue only for a multi-user deployment.
let busy = false;
export async function runProcessor(mode: 'transcribe' | 'translate', signal: AbortSignal, file?: string, text?: string): Promise<unknown> {
  if (busy) throw new Error('正在处理另一项请求，请稍后重试。');
  busy = true;
  try {
    const paths = processorPaths(process.cwd(), process.env, process.platform);
    try { await access(paths.python); }
    catch { throw new Error('本地处理环境尚未安装，请按 README 完成模型安装后重试。'); }
    return await new Promise((resolve, reject) => {
      const child = execFile(paths.python, [paths.worker, mode, ...(file ? [file] : [])],
        { timeout: 600_000, maxBuffer: 2 * 1024 * 1024, signal, killSignal: 'SIGKILL', env: { ...process.env, INFLOW_MODELS_DIR: paths.models, PYTHONIOENCODING: 'utf-8' } }, (error, stdout) => {
          if (error) {
            reject(new Error(signal.aborted ? '处理已取消。' : '本地处理失败或超时，请确认模型已安装，并使用 10 分钟以内、声音清晰的韩语媒体重试。'));
            return;
          }
          try {
            const result = JSON.parse(stdout);
            if (result && typeof result.error === 'string') reject(new Error(result.error));
            else resolve(result);
          } catch { reject(new Error('处理结果无法读取，请重新处理。')); }
        });
      child.stdin?.on('error', () => { /* Process exit is reported by execFile. */ });
      child.stdin?.end(mode === 'translate' ? JSON.stringify({ text }) : undefined);
    });
  } finally { busy = false; }
}

export function foreignOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  const host = request.headers.get('host') ?? url.host;
  return !!origin && origin !== `${url.protocol}//${host}`;
}
