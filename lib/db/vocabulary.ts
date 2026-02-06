import fs from 'fs/promises';
import path from 'path';
import type { VocabularyWord } from '@/lib/types/vocabulary';

const VOCAB_PATH = path.join(process.cwd(), 'data', 'vocabulary.json');

export async function initVocabularyDb() {
  try {
    await fs.access(VOCAB_PATH);
  } catch {
    // If file doesn't exist, try creating it
    const dataDir = path.dirname(VOCAB_PATH);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(VOCAB_PATH, '[]', 'utf-8');
  }
}

export async function getVocabulary(): Promise<VocabularyWord[]> {
  await initVocabularyDb();
  const data = await fs.readFile(VOCAB_PATH, 'utf-8');
  let vocab: VocabularyWord[] = JSON.parse(data);

  // Migration (方案A): backfill missing language based on word/contextSentence
  const { detectLanguageFromSentences } = await import('../language');
  let changed = false;
  vocab = vocab.map((item) => {
    if (!item.language) {
      const hint = detectLanguageFromSentences([
        item.word || '',
        item.contextSentence || '',
      ]);
      const language = hint.code === 'auto' ? undefined : hint.code;
      if (language) {
        changed = true;
        return { ...item, language };
      }
    }
    return item;
  });

  if (changed) {
    await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8');
  }

  return vocab;
}

export async function addWord(word: Omit<VocabularyWord, 'id' | 'createdAt'>): Promise<VocabularyWord> {
  // Ensure the file exists
  let vocab: VocabularyWord[] = [];
  try {
    vocab = await getVocabulary();
  } catch (err) {
    vocab = [];
  }

  const newWord: VocabularyWord = {
    ...word,
    id: Date.now().toString(),
    createdAt: Date.now(),
  };

  vocab.push(newWord);
  await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8');
  return newWord;
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    // ignore missing file
    if (err?.code === 'ENOENT') return;
    throw err;
  }
}

export async function deleteWord(id: string): Promise<void> {
    // Also delete any associated media files (image/audio)
    let vocab = await getVocabulary();
    const existing = vocab.find(w => w.id === id);
    if (existing) {
      // Best-effort cleanup of media files referenced by this word
      const delPaths: Array<string | undefined> = [existing.imagePath, existing.audioPath];
      for (const p of delPaths) {
        if (p && typeof p === 'string') {
          try {
            // Convert public URL like "/uploads/images/xxx.jpg" to local file path
            const rel = p.startsWith('/') ? p.slice(1) : p;
            // Only allow deletion inside public/uploads
            if (rel.startsWith('uploads/')) {
              const full = path.join(process.cwd(), 'public', rel);
              await safeUnlink(full);
            }
          } catch {}
        }
      }
    }

    vocab = vocab.filter(w => w.id !== id);
    await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8');
}

export async function updateWord(id: string, updates: Partial<VocabularyWord>): Promise<VocabularyWord | null> {
    let vocab = await getVocabulary();
    const index = vocab.findIndex(w => w.id === id);
    if (index === -1) return null;

    const prev = vocab[index];

    // If image/audio path is being updated, remove the old file
    const maybeDeleteOld = async (oldPath?: string, newPath?: string) => {
      if (!oldPath || !newPath || oldPath === newPath) return;
      const rel = oldPath.startsWith('/') ? oldPath.slice(1) : oldPath;
      if (rel.startsWith('uploads/')) {
        const full = path.join(process.cwd(), 'public', rel);
        await safeUnlink(full);
      }
    };

    await maybeDeleteOld(prev.imagePath, updates.imagePath);
    await maybeDeleteOld(prev.audioPath, updates.audioPath);

    vocab[index] = { ...prev, ...updates };
    await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8');
    return vocab[index];
}
