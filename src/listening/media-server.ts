import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import type { LookupVocabularyInput, SourceLanguage } from './desktop';

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

export type ProcessorMode = 'probe' | 'transcribe' | 'translate' | 'lookup' | 'models' | 'setup';

export function processorPaths(root: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  return {
    python: env.INFLOW_PYTHON || paths.join(root, '.venv', ...(platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'])),
    // Packaged builds ship a standalone worker executable and no Python interpreter.
    binary: env.INFLOW_WORKER ? paths.resolve(root, env.INFLOW_WORKER) : '',
    worker: paths.join(root, 'scripts', 'media_processor.py'),
    models: env.INFLOW_MODELS_DIR
      ? paths.resolve(root, env.INFLOW_MODELS_DIR)
      : paths.join(root, '.models'),
  };
}

export function processorCommand(mode: ProcessorMode, file: string | undefined, language: SourceLanguage, paths: ReturnType<typeof processorPaths>) {
  if (paths.binary) return { command: paths.binary, args: [mode, ...(file ? [file] : []), ...(mode === 'transcribe' ? [language] : [])] };
  return { command: paths.python, args: [paths.worker, mode, ...(file ? [file] : []), ...(mode === 'transcribe' ? [language] : [])] };
}

type LookupWorker = {
  child: ChildProcessWithoutNullStreams;
  key: string;
  output: string;
  sequence: number;
  idle?: NodeJS.Timeout;
  pending?: { id: number; finish: (error?: Error, result?: unknown) => void };
};

const processorFailure = '本地处理失败或超时，请确认模型已安装，并使用 10 分钟以内、声音清晰的媒体重试。';
const invalidResult = '处理结果无法读取，请重新处理。';
let lookupWorker: LookupWorker | undefined;

function closeLookupWorker(worker: LookupWorker, error: Error) {
  if (lookupWorker !== worker) return;
  lookupWorker = undefined;
  clearTimeout(worker.idle);
  worker.pending?.finish(error);
  worker.child.kill('SIGKILL');
}

export function stopLookupProcessor() {
  if (lookupWorker) closeLookupWorker(lookupWorker, new Error('处理已取消。'));
}

function runLookup(signal: AbortSignal, text: string | LookupVocabularyInput | string[] | undefined, paths: ReturnType<typeof processorPaths>, language: SourceLanguage): Promise<unknown> {
  if (signal.aborted) return Promise.reject(new Error('处理已取消。'));
  const { command, args } = processorCommand('lookup', undefined, language, paths);
  const key = JSON.stringify([command, args, paths.models]);
  if (lookupWorker && lookupWorker.key !== key) stopLookupProcessor();
  if (!lookupWorker) {
    const child = spawn(command, [...args, '--persistent'], {
      windowsHide: true, env: { ...process.env, INFLOW_MODELS_DIR: paths.models, PYTHONIOENCODING: 'utf-8' },
    });
    const worker: LookupWorker = { child, key, output: '', sequence: 0 };
    lookupWorker = worker;
    child.stdout.setEncoding('utf8');
    child.stderr.resume();
    child.stdout.on('data', (chunk: string) => {
      if (lookupWorker !== worker) return;
      worker.output += chunk;
      if (Buffer.byteLength(worker.output) > 2 * 1024 * 1024) return closeLookupWorker(worker, new Error(invalidResult));
      const end = worker.output.indexOf('\n');
      if (end < 0) return;
      const line = worker.output.slice(0, end);
      worker.output = worker.output.slice(end + 1);
      try {
        const response = JSON.parse(line);
        if (!worker.pending || response?.id !== worker.pending.id || !Object.hasOwn(response, 'result') || worker.output) throw new Error();
        const result = response.result;
        worker.pending.finish(result && typeof result.error === 'string' ? new Error(result.error) : undefined, result);
      } catch { closeLookupWorker(worker, new Error(invalidResult)); }
    });
    child.stdin.on('error', () => closeLookupWorker(worker, new Error(processorFailure)));
    child.on('error', () => closeLookupWorker(worker, new Error(processorFailure)));
    child.on('close', () => closeLookupWorker(worker, new Error(processorFailure)));
  }
  const worker = lookupWorker;
  clearTimeout(worker.idle);
  return new Promise((resolve, reject) => {
    const abort = () => closeLookupWorker(worker, new Error('处理已取消。'));
    const timeout = setTimeout(() => closeLookupWorker(worker, new Error(processorFailure)), 30_000);
    const id = ++worker.sequence;
    worker.pending = { id, finish: (error, result) => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.pending = undefined;
      if (lookupWorker === worker) {
        worker.idle = setTimeout(() => closeLookupWorker(worker, new Error(processorFailure)), 60_000);
        worker.idle.unref();
      }
      if (error) reject(error); else resolve(result);
    } };
    signal.addEventListener('abort', abort, { once: true });
    try { worker.child.stdin.write(JSON.stringify({ id, input: text }) + '\n'); }
    catch { closeLookupWorker(worker, new Error(processorFailure)); }
  });
}

// ponytail: one local inference at a time; use a bounded job queue only for a multi-user deployment.
let busy = false;
export async function runProcessor(mode: ProcessorMode, signal: AbortSignal, file?: string, text?: string | LookupVocabularyInput | string[], root = process.cwd(), language: SourceLanguage = 'ko'): Promise<unknown> {
  if (mode !== 'probe' && busy) throw new Error('正在处理另一项请求，请稍后重试。');
  if (mode !== 'probe') busy = true;
  try {
    if (mode !== 'probe' && mode !== 'lookup') stopLookupProcessor();
    const paths = processorPaths(root, process.env, process.platform);
    try { await access(paths.binary || paths.python); }
    catch { throw new Error(paths.binary
      ? '本地处理组件缺失，请重新安装 Inflow 应用后重试。'
      : '本地处理环境尚未安装，请按 README 完成模型安装后重试。'); }
    if (mode === 'lookup') return await runLookup(signal, text, paths, language);
    const { command, args } = processorCommand(mode, file, language, paths);
    return await new Promise((resolve, reject) => {
      const child = execFile(command, args,
        { timeout: 600_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024, signal, killSignal: 'SIGKILL', env: { ...process.env, INFLOW_MODELS_DIR: paths.models, PYTHONIOENCODING: 'utf-8' } }, (error, stdout) => {
          if (error) {
            reject(new Error(signal.aborted ? '处理已取消。' : mode === 'setup' ? '模型下载失败，请检查网络后重试。' : '本地处理失败或超时，请确认模型已安装，并使用 10 分钟以内、声音清晰的媒体重试。'));
            return;
          }
          try {
            const result = JSON.parse(stdout);
            if (result && typeof result.error === 'string') reject(new Error(result.error));
            else resolve(result);
          } catch { reject(new Error('处理结果无法读取，请重新处理。')); }
        });
      child.stdin?.on('error', () => { /* Process exit is reported by execFile. */ });
      child.stdin?.end(mode === 'translate' ? JSON.stringify({ text, language })
        : mode === 'setup' ? JSON.stringify({ components: text })
        : undefined);
    });
  } finally { if (mode !== 'probe') busy = false; }
}

export function foreignOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  const host = request.headers.get('host') ?? url.host;
  return !!origin && origin !== `${url.protocol}//${host}`;
}
