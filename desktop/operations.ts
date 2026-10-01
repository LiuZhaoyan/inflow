import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { copyFile, readFile, stat, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { validateSegments } from '../src/listening/processing';
import type { LearningState, SavedMedia } from '../src/listening/desktop';

type Processor = (mode: 'transcribe' | 'translate', signal: AbortSignal, file?: string, text?: string) => Promise<unknown>;
type MediaRow = { id: string; name: string; filename: string; hash: string; learning: string };
const initialLearning: LearningState = { position: 0, index: 0, rate: 1, loop: false, duration: 0 };

export class DesktopOperations {
  private db: DatabaseSync;
  private jobs = new Map<string, AbortController>();
  private mediaDirectory: string;

  constructor(directory: string, private processor: Processor) {
    mkdirSync(directory, { recursive: true });
    this.mediaDirectory = path.join(directory, 'media');
    mkdirSync(this.mediaDirectory, { recursive: true });
    this.db = new DatabaseSync(path.join(directory, 'learning.sqlite'));
    this.db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, filename TEXT NOT NULL, hash TEXT NOT NULL, learning TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), ordinal INTEGER NOT NULL, content TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }

  private row(id: string): MediaRow {
    if (typeof id !== 'string') throw new Error('素材编号无效。');
    const row = this.db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow | undefined;
    if (!row) throw new Error('素材不存在。');
    return row;
  }

  mediaPath(id: string): string { return path.join(this.mediaDirectory, this.row(id).filename); }

  get(id: string): SavedMedia {
    const row = this.row(id);
    const segments = this.db.prepare('SELECT id, content FROM segments WHERE media_id = ? ORDER BY ordinal').all(id) as { id: string; content: string }[];
    return { id, name: row.name, video: /\.(mp4|webm|mov)$/i.test(row.name), missing: !existsSync(this.mediaPath(id)),
      segments: segments.map(segment => ({ ...JSON.parse(segment.content), id: segment.id })), learning: JSON.parse(row.learning) };
  }

  list(): SavedMedia[] {
    return (this.db.prepare('SELECT id FROM media ORDER BY rowid DESC').all() as { id: string }[]).map(row => this.get(row.id));
  }

  restore(): SavedMedia | null {
    const active = this.db.prepare("SELECT value FROM settings WHERE key = 'active'").get() as { value: string } | undefined;
    return active ? this.get(active.value) : null;
  }

  open(id: string): SavedMedia {
    const media = this.get(id);
    this.db.prepare("INSERT INTO settings VALUES ('active', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
    return media;
  }

  private async inspect(filename: string) {
    const file = await stat(filename);
    if (!file.isFile() || !file.size || file.size > 50 * 1024 * 1024 || !/\.(mp3|mp4|m4a|wav|ogg|webm|mov|flac|aac)$/i.test(filename)) {
      throw new Error('请选择 50 MB 以内的音频或视频文件。');
    }
    return createHash('sha256').update(await readFile(filename)).digest('hex');
  }

  async importMedia(filename: string): Promise<SavedMedia> {
    const hash = await this.inspect(filename);
    const id = randomUUID();
    const managedName = id + path.extname(filename).toLowerCase();
    const destination = path.join(this.mediaDirectory, managedName);
    try {
      await copyFile(filename, destination);
      if (await this.inspect(destination) !== hash) throw new Error('媒体在导入时发生变化，请重试。');
      this.db.prepare('INSERT INTO media VALUES (?, ?, ?, ?, ?)').run(id, path.basename(filename), managedName, hash, JSON.stringify(initialLearning));
    } catch (error) { await rm(destination, { force: true }); throw error; }
    return this.open(id);
  }

  async relink(id: string, filename: string): Promise<SavedMedia> {
    const row = this.row(id);
    if (await this.inspect(filename) !== row.hash) throw new Error('请选择原来的同一媒体文件，以保留句子时间和学习记录。');
    const destination = this.mediaPath(id);
    // Copy first, then replace: a failed copy must leave an existing managed file intact.
    const temporary = destination + '.relink';
    try {
      await copyFile(filename, temporary);
      if (createHash('sha256').update(await readFile(temporary)).digest('hex') !== row.hash) throw new Error('媒体在关联时发生变化，请重试。');
      await rename(temporary, destination);
    } finally { await rm(temporary, { force: true }); }
    return this.open(id);
  }

  saveLearning(id: string, state: LearningState): void {
    const media = this.get(id);
    if (!state || !Number.isFinite(state.duration) || state.duration <= 0 || !Number.isFinite(state.position) || state.position < 0 || state.position > state.duration ||
      !Number.isInteger(state.index) || state.index < 0 || state.index >= Math.max(1, media.segments.length) ||
      ![0.5, 0.75, 1, 1.25, 1.5, 2].includes(state.rate) || typeof state.loop !== 'boolean') throw new Error('学习状态无效。');
    this.db.prepare('UPDATE media SET learning = ? WHERE id = ?').run(JSON.stringify({ position: state.position, index: state.index, rate: state.rate, loop: state.loop, duration: state.duration }), id);
  }

  private async process(job: string, mode: 'transcribe' | 'translate', file?: string, text?: string): Promise<unknown> {
    if (typeof job !== 'string' || !/^[\w-]{1,100}$/.test(job) || this.jobs.has(job)) throw new Error('处理编号无效。');
    const controller = new AbortController();
    this.jobs.set(job, controller);
    try {
      const result = await this.processor(mode, controller.signal, file, text);
      if (controller.signal.aborted) throw new Error('处理已取消。');
      return result;
    } finally { this.jobs.delete(job); }
  }

  async transcribe(id: string, job: string): Promise<SavedMedia> {
    const media = this.get(id);
    if (media.missing) throw new Error('媒体文件丢失，请重新关联。已有原文和学习记录仍然保留。');
    const result = await this.process(job, 'transcribe', this.mediaPath(id)) as { segments?: unknown };
    const segments = validateSegments(result?.segments);
    if (media.learning.duration && segments.at(-1)!.end > media.learning.duration + 0.25) throw new Error('处理时间范围超出媒体长度，请重试。');
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM segments WHERE media_id = ?').run(id);
      const insert = this.db.prepare('INSERT INTO segments VALUES (?, ?, ?, ?)');
      segments.forEach((segment, index) => insert.run(randomUUID(), id, index, JSON.stringify(segment)));
      const learning = { ...this.get(id).learning, index: 0, position: segments[0].start };
      this.db.prepare('UPDATE media SET learning = ? WHERE id = ?').run(JSON.stringify(learning), id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.get(id);
  }

  async translate(text: string, job: string): Promise<string> {
    if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw new Error('翻译内容为空或过长。');
    const result = await this.process(job, 'translate', undefined, text) as { translation?: unknown };
    if (typeof result?.translation !== 'string' || !result.translation.trim()) throw new Error('翻译失败，请重试。');
    return result.translation;
  }

  cancel(job: string): void { this.jobs.get(job)?.abort(); }
  close(): void { for (const job of this.jobs.values()) job.abort(); this.db.close(); }
}
