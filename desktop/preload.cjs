// Sandboxed Electron preloads use CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('inflow', { ...Object.fromEntries(
  ['list', 'restore', 'open', 'chooseImportMedia', 'importMedia', 'cancelImportMedia', 'relink', 'transcribe', 'translate', 'cancel', 'saveLearning', 'listVocabulary', 'listArtifactVocabulary', 'lookupVocabulary', 'glossVocabulary', 'saveVocabulary', 'deleteVocabulary', 'selectVocabulary', 'credentialStatus', 'configureCredential', 'modelStatus', 'setupModels', 'getSettings', 'saveSettings', 'generateArtifact', 'listArtifacts', 'restoreArtifact', 'openArtifact']
    .map(method => [method, (...args) => ipcRenderer.invoke(`inflow:${method}`, ...args)]),
), acceptArtifact: id => {
  const result = ipcRenderer.sendSync('inflow:acceptArtifact', id);
  if (result.error) throw new Error(result.error);
  return result.artifact;
} });
