// Package the Inflow desktop app for Windows as a portable application folder.
// Prerequisite: npm run desktop:worker (built worker), npm run desktop:build (renderer + host).
import { packager } from '@electron/packager';
import { createRequire } from 'node:module';
import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const electronVersion = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
for (const required of ['build/renderer', 'build/desktop/desktop/main.js', 'build/worker/media_processor/media_processor.exe']) {
  if (!existsSync(path.join(root, required))) throw new Error('Missing build artifact: ' + required + '. Run npm run desktop:build and desktop:worker first.');
}
// Stage a minimal application directory: only the compiled renderer, the compiled desktop host,
// and package.json. Sources, node_modules, models, and virtual environments never enter the package.
const staging = path.join(root, 'build', 'package-staging');
await rm(staging, { recursive: true, force: true });
await cp(path.join(root, 'package.json'), path.join(staging, 'package.json'));
await cp(path.join(root, 'LICENSE'), path.join(staging, 'LICENSE'));
await cp(path.join(root, 'build', 'renderer'), path.join(staging, 'build', 'renderer'), { recursive: true });
await cp(path.join(root, 'build', 'desktop'), path.join(staging, 'build', 'desktop'), { recursive: true });
const paths = await packager({
  dir: staging,
  out: path.join(root, 'build', 'package'),
  name: 'Inflow',
  executableName: 'Inflow',
  appBundleId: 'app.inflow.desktop',
  platform: 'win32',
  arch: 'x64',
  electronVersion,
  asar: false,
  prune: false,
  overwrite: true,
  // The standalone worker ships as an Electron resource, outside the app sources.
  extraResource: [path.join(root, 'build', 'worker', 'media_processor')],
  win32metadata: { ProductName: 'Inflow', CompanyName: 'Inflow' },
});
console.log('Packaged at ' + paths.join(', '));
await cp(path.join(root, 'scripts', 'install-desktop.ps1'), path.join(root, 'build', 'package', 'install-desktop.ps1'));
