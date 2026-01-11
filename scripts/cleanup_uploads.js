/*
 Orphaned uploads cleanup for vocabulary media.

 Usage:
   node scripts/cleanup_uploads.js --dry-run    # list files to delete
   node scripts/cleanup_uploads.js --confirm    # delete files

 Only removes files under public/uploads/images and public/uploads/audio
 that are NOT referenced by data/vocabulary.json.
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const VOCAB_JSON = path.join(ROOT, 'data', 'vocabulary.json');
const UPLOADS_IMAGES_DIR = path.join(ROOT, 'public', 'uploads', 'images');
const UPLOADS_AUDIO_DIR = path.join(ROOT, 'public', 'uploads', 'audio');

function getArgFlag() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--confirm')) return 'confirm';
  return 'dry-run';
}

async function readVocabulary() {
  try {
    const raw = await fsp.readFile(VOCAB_JSON, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function toRelUploadPath(p) {
  if (!p || typeof p !== 'string') return null;
  const rel = p.startsWith('/') ? p.slice(1) : p;
  if (!rel.startsWith('uploads/')) return null;
  return rel; // e.g. uploads/images/1767.jpg
}

async function listFiles(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter(d => d.isFile())
      .map(d => path.join(dir, d.name));
  } catch {
    return [];
  }
}

async function main() {
  const mode = getArgFlag();
  const vocab = await readVocabulary();

  const referenced = new Set();
  for (const w of vocab) {
    const ip = toRelUploadPath(w?.imagePath);
    const ap = toRelUploadPath(w?.audioPath);
    if (ip) referenced.add(path.join(ROOT, 'public', ip));
    if (ap) referenced.add(path.join(ROOT, 'public', ap));
  }

  const imgFiles = await listFiles(UPLOADS_IMAGES_DIR);
  const audioFiles = await listFiles(UPLOADS_AUDIO_DIR);
  const candidates = [...imgFiles, ...audioFiles];

  const orphans = candidates.filter(f => !referenced.has(f));

  if (mode === 'dry-run') {
    console.log(`Dry run: found ${orphans.length} orphan file(s).`);
    for (const f of orphans) console.log('DELETE', f);
    console.log('Run with --confirm to delete.');
    return;
  }

  let deleted = 0;
  for (const f of orphans) {
    try {
      await fsp.unlink(f);
      deleted++;
      console.log('Deleted', f);
    } catch (err) {
      console.warn('Failed to delete', f, err?.message);
    }
  }
  console.log(`Done. Deleted ${deleted} orphan file(s).`);
}

main().catch(err => {
  console.error('Cleanup failed:', err?.stack || err?.message || String(err));
  process.exit(1);
});
