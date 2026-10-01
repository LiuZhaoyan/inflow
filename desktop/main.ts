import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DesktopOperations } from './operations';
import { serveMedia } from './media';
import { runProcessor } from '../src/listening/media-server';
import type { LearningState, SaveVocabularyInput } from '../src/listening/desktop';

protocol.registerSchemesAsPrivileged([{ scheme: 'inflow', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const root = path.resolve(__dirname, '../../..');
process.env.INFLOW_PYTHON ||= path.join(root, '.venv-win', 'python.exe');
process.env.INFLOW_MODELS_DIR ||= path.join(root, '.models');
let operations: DesktopOperations;
const trustedUrl = (value: string) => { const url = new URL(value); return url.protocol === 'inflow:' && url.host === 'app' && url.pathname === '/'; };

async function start() {
  operations = new DesktopOperations(app.getPath('userData'), (mode, signal, file, text) => runProcessor(mode, signal, file, text, root));
  const renderer = path.join(root, 'build', 'renderer');
  protocol.handle('inflow', async request => {
    const url = new URL(request.url);
    if (url.host !== 'app' || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 });
    let filename: string;
    try {
      if (url.pathname.startsWith('/media/')) return await serveMedia(operations.mediaPath(decodeURIComponent(url.pathname.slice(7))), request);
      else {
        filename = path.resolve(renderer, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        const relative = path.relative(renderer, filename);
        if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
      }
      const response = await net.fetch(pathToFileURL(filename).toString(), { method: request.method, headers: request.headers });
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'");
      return new Response(response.body, { status: response.status, headers });
    } catch { return new Response('Not found', { status: 404 }); }
  });

  const window = new BrowserWindow({ width: 1440, height: 960, title: 'Inflow',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!trustedUrl(url)) event.preventDefault(); });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  const choose = async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'Audio / Video', extensions: ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm', 'mov', 'flac', 'aac'] }] });
    return result.canceled ? null : result.filePaths[0];
  };
  const handlers: Record<string, (...args: never[]) => unknown> = {
    list: () => operations.list(), restore: () => operations.restore(), open: (id: string) => operations.open(id),
    importMedia: async () => { const file = await choose(); return file ? operations.importMedia(file) : null; },
    relink: async (id: string) => { operations.get(id); const file = await choose(); return file ? operations.relink(id, file) : null; },
    transcribe: (id: string, job: string) => operations.transcribe(id, job),
    translate: (text: string, job: string) => operations.translate(text, job),
    cancel: (job: string) => operations.cancel(job),
    saveLearning: (id: string, state: LearningState) => operations.saveLearning(id, state),
    listVocabulary: () => operations.listVocabulary(),
    saveVocabulary: (input: SaveVocabularyInput) => operations.saveVocabulary(input),
    selectVocabulary: (ids: string[]) => operations.selectVocabulary(ids),
  };
  for (const [method, handler] of Object.entries(handlers)) ipcMain.handle(`inflow:${method}`, (event, ...args) => {
    if (window.isDestroyed() || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !trustedUrl(event.senderFrame?.url || 'about:blank')) throw new Error('访问被拒绝。');
    return handler(...args as never[]);
  });
  window.on('closed', () => app.quit());
  await window.loadURL('inflow://app/');
}

app.whenReady().then(start).catch(error => { console.error(error); app.quit(); });
app.on('before-quit', () => operations?.close());
app.on('window-all-closed', () => app.quit());
