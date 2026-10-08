// Sandboxed Electron preloads use CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('inflow', Object.fromEntries(
  ['list', 'restore', 'open', 'importMedia', 'relink', 'transcribe', 'translate', 'cancel', 'saveLearning', 'listVocabulary', 'lookupVocabulary', 'glossVocabulary', 'saveVocabulary', 'selectVocabulary', 'credentialStatus', 'configureCredential', 'getSettings', 'saveSettings', 'generateArtifact', 'listArtifacts', 'restoreArtifact', 'openArtifact']
    .map(method => [method, (...args) => ipcRenderer.invoke(`inflow:${method}`, ...args)]),
));
