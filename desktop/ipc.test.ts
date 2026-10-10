import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import type { ModelStatus } from '../src/listening/desktop';

const status: ModelStatus = { whisper: true, translate: { 'ko-en': true, 'en-zh': true }, englishParser: true };
type Handler = (event: object, ...args: unknown[]) => unknown;
type Processor = (mode: string, signal: AbortSignal, file?: string, components?: string[]) => Promise<ModelStatus>;

// Execute the real entry point without starting Electron, workers, or a database.
async function host(processor: Processor = async () => status) {
  const handlers = new Map<string, Handler>();
  const navigation = new Map<string, (event: { preventDefault(): void }, url: string) => void>();
  const calls: string[] = [];
  let destroyed = false;
  let loaded!: () => void;
  const ready = new Promise<void>(resolve => { loaded = resolve; });
  const contents = {
    mainFrame: { url: 'inflow://app/' },
    setWindowOpenHandler: () => {},
    on: (name: string, handler: (event: { preventDefault(): void }, url: string) => void) => navigation.set(name, handler),
    session: { setPermissionRequestHandler: () => {} },
  };
  const electron = {
    app: { isPackaged: false, getPath: () => 'test-user-data', requestSingleInstanceLock: () => true,
      on: () => {}, whenReady: () => Promise.resolve(), quit: () => {} },
    BrowserWindow: class {
      webContents = contents;
      isDestroyed() { return destroyed; }
      setMenu() {}
      on() {}
      async loadURL() { loaded(); }
    },
    protocol: { registerSchemesAsPrivileged: () => {}, handle: () => {} },
    ipcMain: { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) },
  };
  const mocks: Record<string, unknown> = {
    electron,
    './operations': { DesktopOperations: class {
      list() { calls.push('list'); return []; }
      cancel(job: string) { calls.push(`cancel:${job}`); }
    } },
    './credentials': { GenerationCredential: class { async initialize() {} } },
    './media': {}, '../src/generation': {},
    '../src/listening/media-server': { runProcessor: processor },
    'node:path': path, 'node:url': {}, 'node:module': {},
  };
  const source = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  vm.runInNewContext(compiled.outputText, {
    require: (name: string) => { assert.ok(name in mocks, `Unexpected import: ${name}`); return mocks[name]; },
    exports: {}, __dirname: path.resolve('build/desktop/desktop'), __filename: path.resolve('build/desktop/desktop/main.js'),
    process: { env: {} }, URL, AbortController, console,
  });
  await ready;
  const event = { sender: contents, senderFrame: contents.mainFrame };
  return { handlers, navigation, calls, contents, event, destroy: () => { destroyed = true; },
    invoke: (method: string, ...args: unknown[]) => handlers.get(`inflow:${method}`)!(event, ...args) };
}

test('preload exposes exactly the typed, registered methods and forwards only named channels', async () => {
  const main = await host();
  let bridge!: Record<string, (...args: unknown[]) => Promise<unknown>>;
  const invocations: unknown[][] = [];
  vm.runInNewContext(readFileSync(new URL('./preload.cjs', import.meta.url), 'utf8'), {
    require: (name: string) => {
      assert.equal(name, 'electron');
      return {
        contextBridge: { exposeInMainWorld: (name: string, value: typeof bridge) => { assert.equal(name, 'inflow'); bridge = value; } },
        ipcRenderer: { invoke: (...args: unknown[]) => { invocations.push(args); return Promise.resolve('reply'); } },
      };
    },
  });
  const types = ts.createSourceFile('desktop.ts', readFileSync(new URL('../src/listening/desktop.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest);
  const declaration = types.statements.find(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'DesktopBridge');
  assert.ok(declaration && ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type));
  const methods = declaration.type.members.map(member => member.name!.getText(types)).sort();
  assert.deepEqual(Object.keys(bridge).sort(), methods);
  assert.deepEqual([...main.handlers.keys()].sort(), methods.map(method => `inflow:${method}`).sort());
  for (const method of methods) {
    const input = { value: method };
    assert.equal(await bridge[method](input, 'job'), 'reply');
    assert.deepEqual(invocations.at(-1), [`inflow:${method}`, input, 'job']);
  }
});

test('every IPC handler denies foreign windows, child frames, untrusted URLs and destroyed windows', async () => {
  const main = await host();
  main.invoke('list');
  assert.deepEqual(main.calls, ['list']);
  for (const handler of main.handlers.values()) {
    assert.throws(() => handler({ ...main.event, sender: {} }), /访问被拒绝/);
    assert.throws(() => handler({ ...main.event, senderFrame: { url: 'inflow://app/' } }), /访问被拒绝/);
    assert.throws(() => handler({ ...main.event, senderFrame: null }), /访问被拒绝/);
    for (const url of ['invalid url', 'https://app/', 'inflow://other/', 'inflow://app/media/id', 'inflow://user:password@app/']) {
      main.contents.mainFrame.url = url;
      assert.throws(() => handler(main.event), /访问被拒绝/);
    }
    main.contents.mainFrame.url = 'inflow://app/';
  }
  main.destroy();
  for (const handler of main.handlers.values()) assert.throws(() => handler(main.event), /访问被拒绝/);
  assert.deepEqual(main.calls, ['list']);
});

test('navigation URL guard fails closed without throwing and retains root queries and fragments', async () => {
  const main = await host();
  for (const url of ['invalid url', 'https://example.com/', 'inflow://app/media/id', 'inflow://user@app/']) {
    let prevented = false;
    main.navigation.get('will-navigate')!({ preventDefault: () => { prevented = true; } }, url);
    assert.equal(prevented, true, url);
  }
  for (const url of ['inflow://app/', 'inflow://app/?mode=listen#sentence']) {
    main.navigation.get('will-navigate')!({ preventDefault: () => assert.fail(url) }, url);
  }
});

test('model setup validates the whole component list before launching a worker and preserves defaults', async () => {
  const received: (string[] | undefined)[] = [];
  const main = await host(async (...args) => { received.push(args[3]); return status; });
  for (const components of [null, 'whisper', {}, [1], new Array(1), Object.assign(new Array(3), { 0: 'whisper', 2: 'translate' }), ['unknown'], ['whisper', 'unknown'], ['whisper', 'whisper'], ['whisper', 'translate', 'english-parser', 'whisper']]) {
    await assert.rejects(async () => main.invoke('setupModels', 'setup', components), /模型组件无效/);
  }
  assert.equal(received.length, 0);
  for (const components of [undefined, [], ['whisper'], ['translate', 'english-parser'], ['whisper', 'translate', 'english-parser']]) {
    assert.equal(await main.invoke('setupModels', 'setup', components), status);
    assert.deepEqual(received.at(-1), components);
  }
  for (const job of [null, '', '../job', 'x'.repeat(101)]) {
    await assert.rejects(async () => main.invoke('setupModels', job), /处理编号无效/);
  }
  assert.equal(received.length, 5);
});

test('model setup rejects cancelled success and failure, and releases job IDs after all outcomes', async () => {
  let signal!: AbortSignal;
  let finish!: (value: ModelStatus) => void;
  let fail!: (error: Error) => void;
  const main = await host(async (...args) => {
    signal = args[1];
    return new Promise<ModelStatus>((resolve, reject) => { finish = resolve; fail = reject; });
  });
  for (const outcome of ['success', 'failure', 'cancelled-success', 'cancelled-failure']) {
    const pending = main.invoke('setupModels', 'same-job');
    await assert.rejects(async () => main.invoke('setupModels', 'same-job'), /处理编号无效/);
    if (outcome.startsWith('cancelled')) { main.invoke('cancel', 'same-job'); assert.equal(signal.aborted, true); }
    else assert.equal(signal.aborted, false);
    if (outcome.endsWith('success')) finish(status);
    else fail(new Error('worker failure'));
    if (outcome.startsWith('cancelled')) await assert.rejects(async () => pending, /处理已取消/);
    else if (outcome === 'failure') await assert.rejects(async () => pending, /worker failure/);
    else assert.equal(await pending, status);
  }
});
