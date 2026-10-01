import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { copyFile, readFile, stat, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { validateSegments } from '../src/listening/processing';
import type { LearningState, SavedMedia, SaveVocabularyInput, VocabularyEntry, VocabularySource } from '../src/listening/desktop';

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
      CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), ordinal INTEGER NOT NULL, content TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS vocabulary (id TEXT PRIMARY KEY, lemma TEXT NOT NULL, meaning TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, UNIQUE(lemma, meaning));
      CREATE TABLE IF NOT EXISTS vocabulary_sources (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary(id), segment_id TEXT NOT NULL REFERENCES segments(id), surface TEXT NOT NULL, sentence TEXT NOT NULL, UNIQUE(entry_id, segment_id, surface));`);
    if (!(this.db.prepare('PRAGMA table_info(segments)').all() as { name: string }[]).some(column => column.name === 'active')) {
      this.db.exec('ALTER TABLE segments ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
    }
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
    const segments = this.db.prepare('SELECT id, content FROM segments WHERE media_id = ? AND active = 1 ORDER BY ordinal').all(id) as { id: string; content: string }[];
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
      // Collected source segments remain immutable; only the latest result appears in the player.
      this.db.prepare('UPDATE segments SET active = 0 WHERE media_id = ?').run(id);
      this.db.prepare('DELETE FROM segments WHERE media_id = ? AND id NOT IN (SELECT segment_id FROM vocabulary_sources)').run(id);
      const insert = this.db.prepare('INSERT INTO segments (id, media_id, ordinal, content) VALUES (?, ?, ?, ?)');
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

  private vocabulary(id: string): VocabularyEntry {
    if (typeof id !== 'string') throw new Error('词汇编号无效。');
    const entry = this.db.prepare('SELECT id, lemma, meaning AS meaningZh, selected FROM vocabulary WHERE id = ?').get(id) as Omit<VocabularyEntry, 'sources' | 'selected'> & { selected: number } | undefined;
    if (!entry) throw new Error('词汇不存在。');
    const sources = this.db.prepare(`SELECT o.id, o.segment_id AS segmentId, o.surface, o.sentence,
      s.media_id AS mediaId, m.name AS mediaName, json_extract(s.content, '$.start') AS start
      FROM vocabulary_sources o JOIN segments s ON s.id = o.segment_id JOIN media m ON m.id = s.media_id
      WHERE o.entry_id = ? ORDER BY o.rowid`).all(id) as VocabularySource[];
    return { ...entry, selected: entry.selected === 1, sources };
  }

  listVocabulary(): VocabularyEntry[] {
    return (this.db.prepare('SELECT id FROM vocabulary ORDER BY rowid DESC').all() as { id: string }[]).map(entry => this.vocabulary(entry.id));
  }

  saveVocabulary(input: SaveVocabularyInput): VocabularyEntry {
    const text = (value: unknown, limit: number) => {
      if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) throw new Error('请填写有效的词典形和中文词义，选中文字也不能为空或过长。');
      return value.trim().normalize('NFC');
    };
    if (!input || typeof input !== 'object') throw new Error('词汇内容无效。');
    const lemma = text(input.lemma, 100), meaning = text(input.meaningZh, 300);
    const matching = this.db.prepare('SELECT id FROM vocabulary WHERE lemma = ? AND meaning = ?').get(lemma, meaning) as { id: string } | undefined;
    if (input.id !== undefined) {
      this.vocabulary(input.id);
      if (matching && matching.id !== input.id) throw new Error('已有同词同义的词条。请保留不同词义，或从原文收集到已有词条。');
    }
    let source: { segmentId: string; surface: string; sentence: string } | undefined;
    if (input.source !== undefined) {
      if (!input.source || typeof input.source.segmentId !== 'string') throw new Error('原句来源无效。');
      const segment = this.db.prepare('SELECT content FROM segments WHERE id = ?').get(input.source.segmentId) as { content: string } | undefined;
      if (!segment) throw new Error('原句已更新，请从当前原文重新收集。');
      const sentence = JSON.parse(segment.content).text as string;
      const surface = text(input.source.surface, 100);
      if (!sentence.normalize('NFC').replace(/\s+/gu, ' ').includes(surface.replace(/\s+/gu, ' '))) throw new Error('选中文字不属于该原句，请重新选择。');
      source = { segmentId: input.source.segmentId, surface, sentence };
    }
    const id = input.id ?? matching?.id ?? randomUUID();
    this.db.exec('BEGIN');
    try {
      if (input.id !== undefined) this.db.prepare('UPDATE vocabulary SET lemma = ?, meaning = ? WHERE id = ?').run(lemma, meaning, id);
      else this.db.prepare('INSERT INTO vocabulary (id, lemma, meaning) VALUES (?, ?, ?) ON CONFLICT(lemma, meaning) DO NOTHING').run(id, lemma, meaning);
      if (source) this.db.prepare('INSERT INTO vocabulary_sources VALUES (?, ?, ?, ?, ?) ON CONFLICT(entry_id, segment_id, surface) DO NOTHING').run(randomUUID(), id, source.segmentId, source.surface, source.sentence);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.vocabulary(id);
  }

  selectVocabulary(ids: string[]): VocabularyEntry[] {
    if (!Array.isArray(ids) || ids.length > 20 || new Set(ids).size !== ids.length) throw new Error('最多选择 20 个不同词条。');
    ids.forEach(id => this.vocabulary(id));
    this.db.exec('BEGIN');
    try {
      this.db.prepare('UPDATE vocabulary SET selected = 0').run();
      const select = this.db.prepare('UPDATE vocabulary SET selected = 1 WHERE id = ?');
      ids.forEach(id => select.run(id));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.listVocabulary();
  }

  cancel(job: string): void { this.jobs.get(job)?.abort(); }
  close(): void { for (const job of this.jobs.values()) job.abort(); this.db.close(); }
}
