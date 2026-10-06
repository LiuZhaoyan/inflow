import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { copyFile, readFile, stat, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { validateSegments, isCompleteEnglishWord } from '../src/listening/processing';
import { generatePassage, validatePassage, type GenerationTarget } from '../src/generation';
import { translateSentence, glossVocabulary } from '../src/listening/translation';
import { dictionaryMeanings } from './dictionary';
import { validateVideoMask } from '../src/listening/video-mask';
import type { LearningArtifact, LearningState, LearningStateInput, SavedMedia, SaveVocabularyInput, VocabularyEntry, VocabularyContext, MediaVocabularySource, ArtifactVocabularySource, LookupVocabularyInput, VocabularyLookup, SourceLanguage, SentenceTranslationInput, TranslationOptions } from '../src/listening/desktop';

type Processor = (mode: 'probe' | 'transcribe' | 'translate' | 'lookup', signal: AbortSignal, file?: string, text?: string | LookupVocabularyInput, language?: SourceLanguage) => Promise<unknown>;
type MediaRow = { id: string; name: string; filename: string; hash: string; learning: string; language: SourceLanguage };
const initialLearning: LearningState = { position: 0, index: 0, rate: 1, loop: false, duration: 0, mode: 'full' };

export class DesktopOperations {
  private db: DatabaseSync;
  private jobs = new Map<string, AbortController>();
  private mediaDirectory: string;

  constructor(directory: string, private processor: Processor, private generator = generatePassage, private translator = translateSentence, private glosser = glossVocabulary) {
    mkdirSync(directory, { recursive: true });
    this.mediaDirectory = path.join(directory, 'media');
    mkdirSync(this.mediaDirectory, { recursive: true });
    this.db = new DatabaseSync(path.join(directory, 'learning.sqlite'));
    this.db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, filename TEXT NOT NULL, hash TEXT NOT NULL, learning TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'ko');
      CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), ordinal INTEGER NOT NULL, content TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS vocabulary (id TEXT PRIMARY KEY, lemma TEXT NOT NULL, meaning TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, language TEXT NOT NULL DEFAULT 'ko', UNIQUE(language, lemma, meaning));
      CREATE TABLE IF NOT EXISTS vocabulary_sources (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary(id), segment_id TEXT NOT NULL REFERENCES segments(id), surface TEXT NOT NULL, sentence TEXT NOT NULL, UNIQUE(entry_id, segment_id, surface));
      CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, content TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS artifact_vocabulary_sources (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary(id), artifact_id TEXT NOT NULL REFERENCES artifacts(id), sentence_index INTEGER NOT NULL, surface TEXT NOT NULL, sentence TEXT NOT NULL, UNIQUE(entry_id, artifact_id, sentence_index, surface));
      CREATE TABLE IF NOT EXISTS translations (segment_id TEXT PRIMARY KEY REFERENCES segments(id) ON DELETE CASCADE, input TEXT NOT NULL, translation TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS vocabulary_positions (context_id TEXT NOT NULL, start INTEGER NOT NULL, PRIMARY KEY(context_id, start));`);
    if (!(this.db.prepare('PRAGMA table_info(media)').all() as { name: string }[]).some(column => column.name === 'language')) {
      this.db.exec("ALTER TABLE media ADD COLUMN language TEXT NOT NULL DEFAULT 'ko'");
    }
    if (!(this.db.prepare('PRAGMA table_info(vocabulary)').all() as { name: string }[]).some(column => column.name === 'language')) {
      this.db.exec('PRAGMA foreign_keys = OFF; BEGIN');
      try {
        this.db.exec(`CREATE TABLE vocabulary_languages (id TEXT PRIMARY KEY, lemma TEXT NOT NULL, meaning TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, language TEXT NOT NULL DEFAULT 'ko', UNIQUE(language, lemma, meaning));
          INSERT INTO vocabulary_languages (rowid, id, lemma, meaning, selected) SELECT rowid, id, lemma, meaning, selected FROM vocabulary;
          DROP TABLE vocabulary;
          ALTER TABLE vocabulary_languages RENAME TO vocabulary;
          COMMIT;`);
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
      finally { this.db.exec('PRAGMA foreign_keys = ON'); }
    }
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
    const learning = JSON.parse(row.learning) as Partial<LearningState>;
    return { id, name: row.name, language: row.language, video: /\.(mp4|webm|mov)$/i.test(row.name), missing: !existsSync(this.mediaPath(id)),
      segments: segments.map(segment => ({ ...JSON.parse(segment.content), id: segment.id })), learning: { ...initialLearning, ...learning, mode: learning.mode === 'sentence' ? 'sentence' : 'full' } };
  }

  list(): SavedMedia[] {
    return (this.db.prepare('SELECT id FROM media ORDER BY rowid DESC').all() as { id: string }[]).map(row => this.get(row.id));
  }

  restore(): SavedMedia | null {
    const active = this.db.prepare("SELECT value FROM settings WHERE key = 'active'").get() as { value: string } | undefined;
    return active ? this.get(active.value) : null;
  }

  getImportLanguage(): SourceLanguage {
    const saved = this.db.prepare("SELECT value FROM settings WHERE key = 'importLanguage'").get();
    return saved?.value === 'en' ? 'en' : 'ko';
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

  async importMedia(filename: string, language: SourceLanguage = 'ko'): Promise<SavedMedia> {
    if (language !== 'ko' && language !== 'en') throw new Error('请选择韩语或英语素材。');
    this.db.prepare("INSERT INTO settings VALUES ('importLanguage', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(language);
    const hash = await this.inspect(filename);
    const probe = await this.processor('probe', new AbortController().signal, filename) as { duration?: unknown };
    if (typeof probe?.duration !== 'number' || !Number.isFinite(probe.duration) || probe.duration <= 0) throw new Error('无法读取媒体时长，请重试。');
    if (probe.duration > 600) throw new Error('请选择 10 分钟以内的媒体。');
    const id = randomUUID();
    const managedName = id + path.extname(filename).toLowerCase();
    const destination = path.join(this.mediaDirectory, managedName);
    try {
      await copyFile(filename, destination);
      if (await this.inspect(destination) !== hash) throw new Error('媒体在导入时发生变化，请重试。');
      this.db.prepare('INSERT INTO media (id, name, filename, hash, learning, language) VALUES (?, ?, ?, ?, ?, ?)').run(id, path.basename(filename), managedName, hash, JSON.stringify({ ...initialLearning, duration: probe.duration }), language);
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

  saveLearning(id: string, state: LearningStateInput): void {
    const media = this.get(id);
    if (!state || !Number.isFinite(state.duration) || state.duration <= 0 || !Number.isFinite(state.position) || state.position < 0 || state.position > state.duration ||
      !Number.isInteger(state.index) || state.index < 0 || state.index >= Math.max(1, media.segments.length) ||
      ![0.5, 0.75, 1, 1.25, 1.5, 2].includes(state.rate) || typeof state.loop !== 'boolean' || (state.mode !== undefined && state.mode !== 'full' && state.mode !== 'sentence')) throw new Error('学习状态无效。');
    const videoMask = validateVideoMask(state.videoMask === undefined ? media.learning.videoMask : state.videoMask);
    if (videoMask && !media.video) throw new Error('视频字幕遮罩只适用于视频。');
    const masks = state.masks === undefined ? media.learning.masks : state.masks;
    if (masks !== undefined) {
      if (!masks || typeof masks !== 'object' || Array.isArray(masks)) throw new Error('学习遮罩无效。');
      const counts = new Map(media.segments.map(segment => [segment.id, segment.groups.length]));
      for (const [segmentId, groups] of Object.entries(masks)) {
        const count = counts.get(segmentId);
        if (count === undefined || !Array.isArray(groups) || groups.some(group => !Number.isInteger(group) || group < 0 || group >= count) || new Set(groups).size !== groups.length) throw new Error('学习遮罩无效。');
      }
    }
    this.db.prepare('UPDATE media SET learning = ? WHERE id = ?').run(JSON.stringify({ position: state.position, index: state.index, rate: state.rate, loop: state.loop, duration: state.duration, mode: state.mode ?? 'full', ...(masks && Object.keys(masks).length ? { masks } : {}), ...(videoMask ? { videoMask } : {}) }), id);
  }

  private async runJob<T>(job: string, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (typeof job !== 'string' || !/^[\w-]{1,100}$/.test(job) || this.jobs.has(job)) throw new Error('处理编号无效。');
    const controller = new AbortController();
    this.jobs.set(job, controller);
    try {
      const result = await work(controller.signal);
      if (controller.signal.aborted) throw new Error('处理已取消。');
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('处理已取消。');
      throw error;
    } finally { this.jobs.delete(job); }
  }

  async transcribe(id: string, job: string): Promise<SavedMedia> {
    const media = this.get(id);
    if (media.missing) throw new Error('媒体文件丢失，请重新关联。已有原文和学习记录仍然保留。');
    const result = await this.runJob(job, signal => this.processor('transcribe', signal, this.mediaPath(id), undefined, media.language)) as { segments?: unknown };
    const segments = validateSegments(result?.segments);
    if (media.learning.duration && segments.at(-1)!.end > media.learning.duration + 0.25) throw new Error('处理时间范围超出媒体长度，请重试。');
    this.db.exec('BEGIN');
    try {
      // Replace this material's transcript and source contexts together; vocabulary entries remain valid.
      this.db.prepare(`DELETE FROM vocabulary_positions WHERE context_id IN (
        SELECT o.id FROM vocabulary_sources o JOIN segments s ON s.id = o.segment_id WHERE s.media_id = ?
      )`).run(id);
      this.db.prepare('DELETE FROM vocabulary_sources WHERE segment_id IN (SELECT id FROM segments WHERE media_id = ?)').run(id);
      this.db.prepare('DELETE FROM segments WHERE media_id = ?').run(id);
      const insert = this.db.prepare('INSERT INTO segments (id, media_id, ordinal, content) VALUES (?, ?, ?, ?)');
      segments.forEach((segment, index) => insert.run(randomUUID(), id, index, JSON.stringify(segment)));
      const learning = this.get(id).learning;
      const index = segments.reduce((selected, segment, current) => segment.start <= learning.position ? current : selected, 0);
      this.db.prepare('UPDATE media SET learning = ? WHERE id = ?').run(JSON.stringify({ ...learning, index, masks: undefined }), id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.get(id);
  }

  async translate(input: SentenceTranslationInput, job: string, apiKey: string, options: TranslationOptions = {}): Promise<string> {
    if (!input || typeof input.mediaId !== 'string' || typeof input.segmentId !== 'string' || !options ||
      (options.refresh !== undefined && typeof options.refresh !== 'boolean') || (options.local !== undefined && typeof options.local !== 'boolean')) throw new Error('翻译请求无效。');
    const media = this.get(input.mediaId);
    const index = media.segments.findIndex(segment => segment.id === input.segmentId);
    if (index < 0) throw new Error('原句已更新，请重新选择。');
    const text = media.segments[index].text;
    const context = { language: media.language, text,
      ...(index > 0 ? { previous: media.segments[index - 1].text } : {}),
      ...(index + 1 < media.segments.length ? { next: media.segments[index + 1].text } : {}) };
    const snapshot = JSON.stringify(context);
    const saved = this.db.prepare('SELECT input, translation FROM translations WHERE segment_id = ?').get(input.segmentId) as { input: string; translation: string } | undefined;
    if (!options.refresh && !options.local && saved?.input === snapshot) return saved.translation;
    const translated = await this.runJob(job, async signal => {
      if (!options.local) return this.translator(context, { apiKey, signal });
      const result = await this.processor('translate', signal, undefined, text, media.language) as { translation?: unknown };
      return result?.translation;
    });
    if (typeof translated !== 'string' || !translated.trim() || translated.length > 10000 || translated.includes('\0')) throw new Error('翻译失败，请重试。');
    // Only commit if the host-owned sentence and its neighbours still match.
    const current = this.get(input.mediaId).segments;
    const now = current.findIndex(segment => segment.id === input.segmentId);
    if (now < 0 || current[now].text !== text || current[now - 1]?.text !== context.previous || current[now + 1]?.text !== context.next) throw new Error('原句已更新，请重新翻译。');
    this.db.prepare('INSERT INTO translations VALUES (?, ?, ?) ON CONFLICT(segment_id) DO UPDATE SET input = excluded.input, translation = excluded.translation').run(input.segmentId, snapshot, translated.trim());
    return translated.trim();
  }

  private validateLookup(input: LookupVocabularyInput): void {
    if (!input || (input.language !== 'ko' && input.language !== 'en')) throw new Error('请选择韩语或英语词汇。');
    const { surface, sentence, start } = input;
    if (typeof surface !== 'string' || !surface || surface.length > 100 || /\s|\0/u.test(surface)) throw new Error('请只选择一个单词（100 字以内）。');
    if (typeof sentence !== 'string' || !sentence || sentence.length > 10000 || sentence.includes('\0') || !Number.isInteger(start) || start < 0 || sentence.slice(start, start + surface.length) !== surface) throw new Error('选中文字不属于该位置的原句。');
    if (input.language === 'en' && !isCompleteEnglishWord(sentence, surface, start)) throw new Error('请选择一个完整单词，包含内部的撇号或连字符。');
    if (input.source && this.sourceSentence(input.source, input.language) !== sentence) throw new Error('选中文字不属于该来源原句。');
    if (input.lemma !== undefined && (typeof input.lemma !== 'string' || !input.lemma.trim() || input.lemma.length > 100 || /\s|\0/u.test(input.lemma))) throw new Error('请填写一个有效的词典形。');
  }

  private vocabularySuggestions(input: LookupVocabularyInput, lemma: string): Pick<VocabularyLookup, 'candidates' | 'meaningZh'> {
    const entries = (this.db.prepare('SELECT id FROM vocabulary WHERE language = ? AND lemma = ? ORDER BY rowid DESC').all(input.language, lemma) as { id: string }[]).map(row => this.vocabulary(row.id));
    const dictionary = dictionaryMeanings(lemma, input.language);
    const candidates = [...new Set([...dictionary, ...entries.map(entry => entry.meaningZh)])];
    const matching = entries.filter(entry => entry.contexts.some(context => {
      if (!input.source || context.sentence !== input.sentence || context.surface !== input.surface) return false;
      const source = context.source, requested = input.source;
      const sameSource = source.type === 'media' && requested.type === 'media'
        ? source.mediaId === requested.mediaId && source.segmentId === requested.segmentId
        : source.type === 'artifact' && requested.type === 'artifact' && source.artifactId === requested.artifactId && source.sentenceIndex === requested.sentenceIndex;
      if (!sameSource) return false;
      const positions = this.db.prepare('SELECT start FROM vocabulary_positions WHERE context_id = ?').all(context.id) as { start: number }[];
      return positions.length ? positions.some(position => position.start === input.start)
        : input.sentence.indexOf(input.surface) === input.start && input.sentence.lastIndexOf(input.surface) === input.start;
    }));
    const meaningZh = matching.length === 1 ? matching[0].meaningZh
      : matching.length === 0 && dictionary.length === 1 && candidates.length === 1 ? dictionary[0] : undefined;
    return { candidates, ...(meaningZh ? { meaningZh } : {}) };
  }

  async lookupVocabulary(input: LookupVocabularyInput, job: string): Promise<VocabularyLookup> {
    this.validateLookup(input);
    const result = input.lemma ? { ...input, lemma: input.lemma }
      : await this.runJob(job, signal => this.processor('lookup', signal, undefined, input)) as VocabularyLookup;
    if (result?.surface !== input.surface || result?.language !== input.language || typeof result?.lemma !== 'string' || !result.lemma.trim() || result.lemma.length > 100 || /\s|\0/u.test(result.lemma)) throw new Error('无法确定词典形，请手动填写。');
    const lemma = input.language === 'en' ? result.lemma.normalize('NFC').replaceAll('’', "'") : result.lemma.normalize('NFC');
    return { surface: input.surface, lemma, language: input.language, ...this.vocabularySuggestions(input, lemma) };
  }

  async glossVocabulary(input: LookupVocabularyInput & { lemma: string }, job: string, apiKey: string): Promise<string> {
    this.validateLookup(input);
    if (!input.lemma) throw new Error('请填写词典形。');
    const { candidates } = this.vocabularySuggestions(input, input.lemma);
    const result = await this.runJob(job, signal => this.glosser({ language: input.language, lemma: input.lemma, surface: input.surface,
      sentence: input.sentence, start: input.start, candidates }, { apiKey, signal }));
    if (typeof result !== 'string' || !result.trim() || result.length > 300 || result.includes('\0')) throw new Error('词义结果无效，请重试。');
    return result.trim();
  }

  private sourceSentence(source: VocabularyContext['source'], language: SourceLanguage): string {
    if (!source || typeof source !== 'object') throw new Error('原句来源无效。');
    let sentence: string;
    if (source.type === 'media') {
      if ('artifactId' in source || typeof source.segmentId !== 'string' || typeof source.mediaId !== 'string') throw new Error('原句来源无效。');
      const segment = this.db.prepare('SELECT content FROM segments WHERE id = ? AND media_id = ?').get(source.segmentId, source.mediaId) as { content: string } | undefined;
      if (!segment) throw new Error('原句已更新，请从当前原文重新收集。');
      if (this.row(source.mediaId).language !== language) throw new Error('词汇语种与来源不一致。');
      sentence = JSON.parse(segment.content).text as string;
    } else if (source.type === 'artifact') {
      if ('segmentId' in source) throw new Error('原句来源无效。');
      const artifact = this.artifact(source.artifactId);
      if (artifact.language !== language) throw new Error('词汇语种与来源不一致。');
      if (!Number.isInteger(source.sentenceIndex) || !artifact.sentences[source.sentenceIndex]) throw new Error('短文原句编号无效。');
      sentence = artifact.sentences[source.sentenceIndex].parts.map(part => part.text).join('');
    } else throw new Error('原句来源无效。');
    return sentence;
  }

  private vocabulary(id: string): VocabularyEntry {
    if (typeof id !== 'string') throw new Error('词汇编号无效。');
    const entry = this.db.prepare('SELECT id, language, lemma, meaning AS meaningZh, selected FROM vocabulary WHERE id = ?').get(id) as Omit<VocabularyEntry, 'contexts' | 'selected'> & { selected: number } | undefined;
    if (!entry) throw new Error('词汇不存在。');
    const sources = this.db.prepare(`SELECT o.id, o.segment_id AS segmentId, o.surface, o.sentence,
      s.media_id AS mediaId, m.name AS name, json_extract(s.content, '$.start') AS start
      FROM vocabulary_sources o JOIN segments s ON s.id = o.segment_id JOIN media m ON m.id = s.media_id
      WHERE o.entry_id = ? ORDER BY o.rowid`).all(id) as (Omit<VocabularyContext, 'source'> & Omit<MediaVocabularySource, 'type'>)[];
    const artifactSources = this.db.prepare(`SELECT o.id, o.artifact_id AS artifactId, json_extract(a.content, '$.title') AS name,
      o.sentence_index AS sentenceIndex, o.surface, o.sentence
      FROM artifact_vocabulary_sources o JOIN artifacts a ON a.id = o.artifact_id WHERE o.entry_id = ? ORDER BY o.rowid`).all(id) as (Omit<VocabularyContext, 'source'> & Omit<ArtifactVocabularySource, 'type'>)[];
    const contexts: VocabularyContext[] = [
      ...sources.map(({ id, surface, sentence, ...source }) => ({ id, surface, sentence, source: { type: 'media' as const, ...source } })),
      ...artifactSources.map(({ id, surface, sentence, ...source }) => ({ id, surface, sentence, source: { type: 'artifact' as const, ...source } })),
    ];
    return { ...entry, selected: entry.selected === 1, contexts };
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
    const language = input.language ?? (input.id ? this.vocabulary(input.id).language : 'ko');
    if (language !== 'ko' && language !== 'en') throw new Error('请选择韩语或英语词汇。');
    const rawLemma = text(input.lemma, 100), meaning = text(input.meaningZh, 300);
    const lemma = language === 'en' ? rawLemma.replaceAll('’', "'") : rawLemma;
    if (/\s/u.test(lemma)) throw new Error('请只收藏一个单词。');
    const matching = this.db.prepare('SELECT id FROM vocabulary WHERE language = ? AND lemma = ? AND meaning = ?').get(language, lemma, meaning) as { id: string } | undefined;
    if (input.id !== undefined) {
      if (this.vocabulary(input.id).language !== language) throw new Error('不能改变已有词条的语种，请新建词条。');
      if (matching && matching.id !== input.id) throw new Error('已有同词同义的词条。请保留不同词义，或从原文收集到已有词条。');
    }
    let context: SaveVocabularyInput['context'];
    if (input.context !== undefined) {
      if (!input.context || typeof input.context !== 'object' || !input.context.source || typeof input.context.source !== 'object') throw new Error('原句来源无效。');
      const source = input.context.source;
      const sentence = this.sourceSentence(source, language);
      const normalizedSurface = text(input.context.surface, 100);
      const surface = language === 'en' ? input.context.surface.trim() : normalizedSurface;
      if (!sentence.normalize('NFC').replace(/\s+/gu, ' ').includes(normalizedSurface.replace(/\s+/gu, ' '))) throw new Error('选中文字不属于该原句，请重新选择。');
      if (/\s/u.test(surface)) throw new Error('请只选择一个单词。');
      // Snapshot the host-owned sentence; source display metadata is rebuilt on read.
      const surfaceStart = input.context.surfaceStart;
      if (surfaceStart !== undefined && (!Number.isInteger(surfaceStart) || surfaceStart < 0 || sentence.slice(surfaceStart, surfaceStart + surface.length) !== surface)) throw new Error('选中文字的位置无效，请重新选择。');
      if (language === 'en' && !isCompleteEnglishWord(sentence, surface, surfaceStart)) throw new Error('请选择一个完整单词，包含内部的撇号或连字符。');
      context = { source, surface, sentence, ...(surfaceStart !== undefined ? { surfaceStart } : {}) };
    }
    const id = input.id ?? matching?.id ?? randomUUID();
    this.db.exec('BEGIN');
    try {
      if (input.id !== undefined) this.db.prepare('UPDATE vocabulary SET lemma = ?, meaning = ?, language = ? WHERE id = ?').run(lemma, meaning, language, id);
      else this.db.prepare('INSERT INTO vocabulary (id, lemma, meaning, language) VALUES (?, ?, ?, ?) ON CONFLICT(language, lemma, meaning) DO NOTHING').run(id, lemma, meaning, language);
      if (context?.source.type === 'media') this.db.prepare('INSERT INTO vocabulary_sources VALUES (?, ?, ?, ?, ?) ON CONFLICT(entry_id, segment_id, surface) DO NOTHING').run(randomUUID(), id, context.source.segmentId, context.surface, context.sentence);
      else if (context?.source.type === 'artifact') this.db.prepare('INSERT INTO artifact_vocabulary_sources VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(entry_id, artifact_id, sentence_index, surface) DO NOTHING').run(randomUUID(), id, context.source.artifactId, context.source.sentenceIndex, context.surface, context.sentence);
      if (context?.surfaceStart !== undefined) {
        const row = context.source.type === 'media'
          ? this.db.prepare('SELECT id FROM vocabulary_sources WHERE entry_id = ? AND segment_id = ? AND surface = ?').get(id, context.source.segmentId, context.surface)
          : this.db.prepare('SELECT id FROM artifact_vocabulary_sources WHERE entry_id = ? AND artifact_id = ? AND sentence_index = ? AND surface = ?').get(id, context.source.artifactId, context.source.sentenceIndex, context.surface);
        this.db.prepare('INSERT INTO vocabulary_positions VALUES (?, ?) ON CONFLICT DO NOTHING').run(row!.id, context.surfaceStart);
      }
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

  private artifact(id: string): LearningArtifact {
    if (typeof id !== 'string') throw new Error('短文编号无效。');
    const row = this.db.prepare('SELECT content FROM artifacts WHERE id = ?').get(id) as { content: string } | undefined;
    if (!row) throw new Error('短文不存在。');
    return { language: 'ko', ...JSON.parse(row.content), id };
  }

  listArtifacts(): LearningArtifact[] {
    return (this.db.prepare('SELECT id FROM artifacts ORDER BY rowid DESC').all() as { id: string }[]).map(row => this.artifact(row.id));
  }

  restoreArtifact(): LearningArtifact | null {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'artifact'").get() as { value: string } | undefined;
    return row ? this.artifact(row.value) : null;
  }

  openArtifact(id: string): LearningArtifact {
    const artifact = this.artifact(id);
    this.db.prepare("INSERT INTO settings VALUES ('artifact', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
    return artifact;
  }

  async generateArtifact(ids: string[], topic: string, job: string, apiKey: string): Promise<LearningArtifact> {
    if (!Array.isArray(ids) || !ids.length || ids.length > 20 || new Set(ids).size !== ids.length) throw new Error('请选择 1–20 个不同的目标词汇。');
    if (typeof topic !== 'string' || topic.length > 200 || topic.includes('\0')) throw new Error('主题请控制在 200 字以内。');
    const entries = ids.map(id => this.vocabulary(id));
    const language = entries[0].language;
    if (entries.some(entry => entry.language !== language)) throw new Error('目标词汇包含不同语种，请选择同一语言的词汇后再生成。');
    const targets: GenerationTarget[] = entries.map(entry => {
      const sentence = entry.contexts[0]?.sentence;
      return { id: entry.id, lemma: entry.lemma, meaningZh: entry.meaningZh, ...(sentence ? { sourceSentence: sentence.slice(0, 1000) } : {}) };
    });
    const started = Date.now();
    const result = await this.runJob(job, signal => this.generator({ language, targets, ...(topic.trim() ? { topic: topic.trim() } : {}) }, { apiKey, signal }));
    const content = {
      language,
      ...validatePassage({ title: result.title, sentences: result.sentences }, targets), targets,
      createdAt: new Date().toISOString(), elapsedMs: Date.now() - started, requestedModel: result.requestedModel,
      ...(result.model ? { model: result.model } : {}), ...(result.responseId ? { responseId: result.responseId } : {}),
      ...(result.usage ? { usage: result.usage } : {}), ...(topic.trim() ? { topic: topic.trim() } : {}),
    };
    const id = randomUUID();
    // One JSON record commits passage, translations, highlights, metadata and target snapshots together.
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO artifacts VALUES (?, ?)').run(id, JSON.stringify(content));
      this.db.prepare("INSERT INTO settings VALUES ('artifact', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.artifact(id);
  }

  cancel(job: string): void { this.jobs.get(job)?.abort(); }
  close(): void { for (const job of this.jobs.values()) job.abort(); this.db.close(); }
}
