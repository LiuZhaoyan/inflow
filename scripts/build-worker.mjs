// Build the Windows media worker into a standalone one-folder executable with PyInstaller.
// Prerequisite (native Windows Python venv): .venv-win/Scripts/pip install pyinstaller
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const venv = path.join(root, '.venv-win');
const pyinstaller = path.join(venv, 'Scripts', 'pyinstaller.exe');
if (!existsSync(pyinstaller)) throw new Error('PyInstaller is missing from .venv-win. Run: .venv-win\\Scripts\\pip install pyinstaller');
const dist = path.join(root, 'build', 'worker');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(root, 'build'), { recursive: true });
// collect-all keeps native libraries and bundled data (Korean morphological data, spaCy tables,
// tokenizers JSON) intact; setup_models.py is imported lazily by the `setup` mode.
// The conda-style venv keeps CPython runtime DLLs in Library/bin where PyInstaller does not look;
// ssl/ctypes/sqlite/expat extensions need them at runtime (HTTPS model downloads, tokenizers).
const runtimeDlls = ['libcrypto-3-x64.dll', 'libssl-3-x64.dll', 'ffi-8.dll', 'libexpat.dll', 'sqlite3.dll']
  .filter(name => existsSync(path.join(venv, 'Library', 'bin', name)))
  .flatMap(name => ['--add-binary', path.join(venv, 'Library', 'bin', name) + ';.']);
const result = spawnSync(pyinstaller, [
  '--noconfirm', '--clean', '--onedir',
  '--name', 'media_processor',
  '--distpath', dist,
  '--workpath', path.join(root, 'build', 'pyinstaller-work'),
  '--specpath', path.join(root, 'build', 'pyinstaller-work'),
  '--paths', path.join(root, 'scripts'),
  ...runtimeDlls,
  '--collect-all', 'faster_whisper',
  '--collect-all', 'ctranslate2',
  '--collect-all', 'tokenizers',
  '--collect-all', 'av',
  '--collect-all', 'sentencepiece',
  '--collect-all', 'kiwipiepy',
  '--collect-all', 'kiwipiepy_model',
  '--collect-all', 'spacy',
  '--collect-all', 'huggingface_hub',
  '--hidden-import', 'setup_models',
  path.join(root, 'scripts', 'media_processor.py'),
], { stdio: 'inherit', timeout: 600_000 });
if (result.status !== 0) process.exit(result.status ?? 1);
const exe = path.join(dist, 'media_processor', 'media_processor.exe');
if (!existsSync(exe)) throw new Error('Worker executable was not produced: ' + exe);
console.log('Worker built at ' + exe);
