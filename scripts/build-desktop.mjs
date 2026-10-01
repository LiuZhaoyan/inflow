import { mkdir, cp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const stage = path.join(root, 'build', 'renderer-source');
await mkdir(path.join(stage, 'src', 'app'), { recursive: true });
await mkdir(path.join(stage, 'src', 'listening'), { recursive: true });
// Only the renderer enters the static build; the browser API routes stay in the prototype.
for (const file of ['page.tsx', 'layout.tsx', 'globals.css', 'icon.svg']) await cp(path.join(root, 'src/app', file), path.join(stage, 'src/app', file));
for (const file of ['Practice.tsx', 'RevealMenu.tsx', 'reveal.ts', 'processing.ts', 'desktop.ts']) await cp(path.join(root, 'src/listening', file), path.join(stage, 'src/listening', file));
await cp(path.join(root, 'tsconfig.json'), path.join(stage, 'tsconfig.json'));
await writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: 'inflow-renderer', private: true }));
await writeFile(path.join(stage, 'next.config.mjs'), "export default { output: 'export', images: { unoptimized: true }, turbopack: { root: " + JSON.stringify(root) + " } };\n");
function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules', script), ...args], { stdio: 'inherit', cwd: root });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('typescript/bin/tsc', ['-p', 'desktop/tsconfig.json']);
await cp(path.join(root, 'desktop/preload.cjs'), path.join(root, 'build/desktop/desktop/preload.cjs'));
run('next/dist/bin/next', ['build', stage, '--webpack']);
await cp(path.join(stage, 'out'), path.join(root, 'build/renderer'), { recursive: true });
