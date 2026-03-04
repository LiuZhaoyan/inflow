const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { performance } = require('perf_hooks');

function parseScaleArg() {
  const arg = process.argv.find((item) => item.startsWith('--scale='));
  return (arg ? arg.split('=')[1] : 'small').toLowerCase();
}

function getConfig(scale) {
  if (scale === 'large') {
    return {
      users: 200,
      vocabularyPerUser: 150,
      storiesPerUser: 80,
      chatPerUser: 240,
      masteredPerUser: 120,
    };
  }
  if (scale === 'medium') {
    return {
      users: 80,
      vocabularyPerUser: 80,
      storiesPerUser: 40,
      chatPerUser: 120,
      masteredPerUser: 60,
    };
  }
  return {
    users: 30,
    vocabularyPerUser: 30,
    storiesPerUser: 16,
    chatPerUser: 48,
    masteredPerUser: 24,
  };
}

function uid(prefix, i, j) {
  if (typeof j === 'number') return `${prefix}-${i}-${j}`;
  return `${prefix}-${i}`;
}

function nowMs() {
  return Date.now();
}

function createTestDb() {
  const dbDir = path.join(process.cwd(), 'data', 'tmp-db-tests');
  fs.mkdirSync(dbDir, { recursive: true });
  const dbFile = path.join(dbDir, `db-layer-${Date.now()}.db`);
  const db = new Database(dbFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return { db, dbFile };
}

function createSchema(db) {
  db.exec(`
CREATE TABLE users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  username text DEFAULT '' NOT NULL,
  native_language text DEFAULT 'en' NOT NULL,
  target_language text DEFAULT 'ko' NOT NULL,
  current_language_code text DEFAULT 'ko',
  is_onboarded integer DEFAULT false,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE books (
  id text PRIMARY KEY NOT NULL,
  user_id text,
  title text NOT NULL,
  level text,
  language text,
  metadata text,
  content_path text,
  preview text,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE set null
);

CREATE TABLE vocabulary (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  word text NOT NULL,
  definition text DEFAULT '' NOT NULL,
  context_sentence text,
  translation text,
  image_path text,
  audio_path text,
  language text,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE stories (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  content text NOT NULL,
  translation text,
  words text,
  language text,
  translation_language text,
  audio_path text,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE chat_messages (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  language_code text NOT NULL,
  context text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  message_type text,
  original_sentence text,
  difficulty_estimate integer,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE learning_progress (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  language_code text NOT NULL,
  current_difficulty_level integer DEFAULT 3,
  initial_difficulty_level integer DEFAULT 3,
  placement_completed integer DEFAULT false,
  learning_profile text,
  performance_metrics text,
  last_updated integer,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE UNIQUE INDEX learning_progress_user_id_language_code_unique
ON learning_progress (user_id, language_code);

CREATE TABLE mastered_sentences (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  content text NOT NULL,
  translation text,
  context text,
  language_code text,
  difficulty_level integer,
  audio_path text,
  message_id text,
  mastered_at integer NOT NULL,
  review_count integer DEFAULT 0,
  last_reviewed_at integer,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE reading_progress (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  book_id text NOT NULL,
  chapter_index integer DEFAULT 0,
  sentence_index integer DEFAULT 0,
  completed_at integer,
  last_read_at integer,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE cascade
);
  `);
}

function metric(samples, label) {
  const totalMs = samples.reduce((acc, n) => acc + n, 0);
  const avgMs = samples.length ? totalMs / samples.length : 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const p95Ms = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const opsPerSec = totalMs > 0 ? (samples.length / totalMs) * 1000 : 0;
  return {
    label,
    count: samples.length,
    totalMs: Number(totalMs.toFixed(3)),
    avgMs: Number(avgMs.toFixed(3)),
    p95Ms: Number(p95Ms.toFixed(3)),
    opsPerSec: Number(opsPerSec.toFixed(2)),
  };
}

function measureLoop(label, count, fn) {
  const samples = [];
  for (let i = 0; i < count; i += 1) {
    const t0 = performance.now();
    fn(i);
    samples.push(performance.now() - t0);
  }
  return metric(samples, label);
}

function runSchemaChecks(db) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type='index'")
    .all()
    .map((r) => r.name);

  const requiredTables = [
    'users',
    'books',
    'vocabulary',
    'stories',
    'chat_messages',
    'learning_progress',
    'mastered_sentences',
    'reading_progress',
  ];

  const requiredIndexes = [
    'users_email_unique',
    'learning_progress_user_id_language_code_unique',
  ];

  const missingTables = requiredTables.filter((t) => !tables.includes(t));
  const missingIndexes = requiredIndexes.filter((i) => !indexes.includes(i));

  return {
    pass: missingTables.length === 0 && missingIndexes.length === 0,
    missingTables,
    missingIndexes,
  };
}

function runConstraintChecks(db) {
  const result = [];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, username, native_language, target_language, current_language_code, is_onboarded, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const baseTs = nowMs();
  insertUser.run('u-constraint', 'u-constraint@x.com', 'hash', 'u', 'en', 'ko', 'ko', 0, baseTs, baseTs);

  try {
    insertUser.run('u-constraint-2', 'u-constraint@x.com', 'hash', 'u2', 'en', 'ko', 'ko', 0, baseTs, baseTs);
    result.push({ name: 'users.email unique', pass: false, detail: 'duplicate email accepted' });
  } catch {
    result.push({ name: 'users.email unique', pass: true });
  }

  try {
    db.prepare(`
      INSERT INTO vocabulary (id, user_id, word, definition, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('v-fk-1', 'missing-user', 'hello', 'd', baseTs);
    result.push({ name: 'vocabulary.user_id FK', pass: false, detail: 'invalid FK accepted' });
  } catch {
    result.push({ name: 'vocabulary.user_id FK', pass: true });
  }

  db.prepare(`
    INSERT INTO learning_progress (id, user_id, language_code, current_difficulty_level, initial_difficulty_level, placement_completed, learning_profile, performance_metrics, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('lp-1', 'u-constraint', 'ko', 3, 3, 0, '{}', '{}', baseTs);

  try {
    db.prepare(`
      INSERT INTO learning_progress (id, user_id, language_code, current_difficulty_level, initial_difficulty_level, placement_completed, learning_profile, performance_metrics, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('lp-2', 'u-constraint', 'ko', 4, 4, 0, '{}', '{}', baseTs + 1);
    result.push({ name: 'learning_progress unique(user_id,language_code)', pass: false, detail: 'duplicate pair accepted' });
  } catch {
    result.push({ name: 'learning_progress unique(user_id,language_code)', pass: true });
  }

  db.prepare(`
    INSERT INTO books (id, user_id, title, level, language, metadata, content_path, preview, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('book-cascade', 'u-constraint', 'book', 'A1', 'ko', '{}', 'book.json', '[]', baseTs);

  db.prepare(`
    INSERT INTO vocabulary (id, user_id, word, definition, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('v-cascade', 'u-constraint', 'word', 'def', baseTs);

  db.prepare(`
    INSERT INTO stories (id, user_id, content, translation, words, language, translation_language, audio_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('s-cascade', 'u-constraint', 'story', 'st', '[]', 'ko', 'zh', null, baseTs);

  db.prepare(`
    INSERT INTO chat_messages (id, user_id, language_code, context, role, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('c-cascade', 'u-constraint', 'ko', 'learn', 'assistant', 'hello', baseTs);

  db.prepare(`
    INSERT INTO mastered_sentences (id, user_id, content, language_code, mastered_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('m-cascade', 'u-constraint', 'sentence', 'ko', baseTs);

  db.prepare(`
    INSERT INTO reading_progress (id, user_id, book_id, chapter_index, sentence_index, completed_at, last_read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('r-cascade', 'u-constraint', 'book-cascade', 0, 0, null, baseTs);

  db.prepare(`DELETE FROM users WHERE id = ?`).run('u-constraint');

  const counts = {
    vocabulary: db.prepare(`SELECT COUNT(*) as c FROM vocabulary WHERE user_id = ?`).get('u-constraint').c,
    stories: db.prepare(`SELECT COUNT(*) as c FROM stories WHERE user_id = ?`).get('u-constraint').c,
    chat_messages: db.prepare(`SELECT COUNT(*) as c FROM chat_messages WHERE user_id = ?`).get('u-constraint').c,
    learning_progress: db.prepare(`SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ?`).get('u-constraint').c,
    mastered_sentences: db.prepare(`SELECT COUNT(*) as c FROM mastered_sentences WHERE user_id = ?`).get('u-constraint').c,
    reading_progress: db.prepare(`SELECT COUNT(*) as c FROM reading_progress WHERE user_id = ?`).get('u-constraint').c,
    booksUserIdNull: db
      .prepare(`SELECT COUNT(*) as c FROM books WHERE id = ? AND user_id IS NULL`)
      .get('book-cascade').c,
  };

  result.push({
    name: 'ON DELETE cascade / set null',
    pass:
      counts.vocabulary === 0 &&
      counts.stories === 0 &&
      counts.chat_messages === 0 &&
      counts.learning_progress === 0 &&
      counts.mastered_sentences === 0 &&
      counts.reading_progress === 0 &&
      counts.booksUserIdNull === 1,
    detail: counts,
  });

  return result;
}

function seedUsers(db, users) {
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, username, native_language, target_language, current_language_code, is_onboarded, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((count) => {
    for (let i = 0; i < count; i += 1) {
      const ts = nowMs();
      stmt.run(uid('u', i), `u${i}@x.com`, 'hash', `user${i}`, 'en', 'ko', 'ko', 1, ts, ts);
    }
  });

  const t0 = performance.now();
  tx(users);
  const totalMs = performance.now() - t0;
  return {
    label: 'users bulk insert(tx)',
    count: users,
    totalMs: Number(totalMs.toFixed(3)),
    avgMs: Number((totalMs / users).toFixed(3)),
    p95Ms: 0,
    opsPerSec: Number(((users / totalMs) * 1000).toFixed(2)),
  };
}

function runCrudBenchmarks(db, cfg) {
  const metrics = [];

  metrics.push(seedUsers(db, cfg.users));

  const userFindStmt = db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`);
  metrics.push(
    measureLoop('users point lookup', cfg.users, (i) => {
      userFindStmt.get(uid('u', i));
    }),
  );

  const insertBook = db.prepare(`
    INSERT INTO books (id, user_id, title, level, language, metadata, content_path, preview, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalBooks = Math.max(1, cfg.users);
  metrics.push(
    measureLoop('books insert', totalBooks, (i) => {
      insertBook.run(uid('b', i), uid('u', i % cfg.users), `book-${i}`, 'A1', 'ko', '{}', `${i}.json`, '[]', nowMs());
    }),
  );

  const insertReadingProgress = db.prepare(`
    INSERT INTO reading_progress (id, user_id, book_id, chapter_index, sentence_index, completed_at, last_read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const readingCount = Math.max(1, cfg.users * 2);
  metrics.push(
    measureLoop('reading_progress insert', readingCount, (i) => {
      insertReadingProgress.run(uid('rp', i), uid('u', i % cfg.users), uid('b', i % totalBooks), i % 5, i % 20, null, nowMs());
    }),
  );

  const insertVocabulary = db.prepare(`
    INSERT INTO vocabulary (id, user_id, word, definition, context_sentence, translation, image_path, audio_path, language, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalVocabulary = cfg.users * cfg.vocabularyPerUser;
  metrics.push(
    measureLoop('vocabulary insert', totalVocabulary, (i) => {
      const u = i % cfg.users;
      insertVocabulary.run(
        uid('v', u, i),
        uid('u', u),
        `word-${i}`,
        `def-${i}`,
        `ctx-${i}`,
        `tr-${i}`,
        null,
        null,
        'ko',
        nowMs(),
      );
    }),
  );

  const vocabularyByUser = db.prepare(`
    SELECT * FROM vocabulary WHERE user_id = ? ORDER BY created_at DESC
  `);
  metrics.push(
    measureLoop('vocabulary by user query', cfg.users, (i) => {
      vocabularyByUser.all(uid('u', i));
    }),
  );

  const updateVocabulary = db.prepare(`
    UPDATE vocabulary SET definition = ? WHERE id = ?
  `);
  metrics.push(
    measureLoop('vocabulary update', totalVocabulary, (i) => {
      const u = i % cfg.users;
      updateVocabulary.run(`updated-${i}`, uid('v', u, i));
    }),
  );

  const insertStories = db.prepare(`
    INSERT INTO stories (id, user_id, content, translation, words, language, translation_language, audio_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalStories = cfg.users * cfg.storiesPerUser;
  metrics.push(
    measureLoop('stories insert', totalStories, (i) => {
      const u = i % cfg.users;
      insertStories.run(uid('s', u, i), uid('u', u), `story-${i}`, `tr-${i}`, '["w1","w2"]', 'ko', 'zh', null, nowMs());
    }),
  );

  const storiesByUser = db.prepare(`
    SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC
  `);
  metrics.push(
    measureLoop('stories by user query', cfg.users, (i) => {
      storiesByUser.all(uid('u', i));
    }),
  );

  const insertChat = db.prepare(`
    INSERT INTO chat_messages (id, user_id, language_code, context, role, content, message_type, original_sentence, difficulty_estimate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalChat = cfg.users * cfg.chatPerUser;
  metrics.push(
    measureLoop('chat_messages insert', totalChat, (i) => {
      const u = i % cfg.users;
      insertChat.run(uid('c', u, i), uid('u', u), 'ko', 'learn', i % 2 ? 'assistant' : 'user', `msg-${i}`, 'chat', null, i % 10, nowMs());
    }),
  );

  const chatByContext = db.prepare(`
    SELECT * FROM chat_messages
    WHERE user_id = ? AND language_code = ? AND context = ?
    ORDER BY created_at DESC
    LIMIT 50
  `);
  metrics.push(
    measureLoop('chat_messages scoped query', cfg.users, (i) => {
      chatByContext.all(uid('u', i), 'ko', 'learn');
    }),
  );

  const insertProgress = db.prepare(`
    INSERT INTO learning_progress (id, user_id, language_code, current_difficulty_level, initial_difficulty_level, placement_completed, learning_profile, performance_metrics, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  metrics.push(
    measureLoop('learning_progress insert', cfg.users, (i) => {
      insertProgress.run(uid('lp', i), uid('u', i), 'ko', 3, 3, 0, '{}', '{}', nowMs());
    }),
  );

  const updateProgress = db.prepare(`
    UPDATE learning_progress
    SET current_difficulty_level = ?, last_updated = ?
    WHERE user_id = ? AND language_code = ?
  `);
  metrics.push(
    measureLoop('learning_progress update', cfg.users, (i) => {
      updateProgress.run((i % 10) + 1, nowMs(), uid('u', i), 'ko');
    }),
  );

  const insertMastered = db.prepare(`
    INSERT INTO mastered_sentences (id, user_id, content, translation, context, language_code, difficulty_level, audio_path, message_id, mastered_at, review_count, last_reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalMastered = cfg.users * cfg.masteredPerUser;
  metrics.push(
    measureLoop('mastered_sentences insert', totalMastered, (i) => {
      const u = i % cfg.users;
      insertMastered.run(uid('m', u, i), uid('u', u), `sentence-${i}`, `tr-${i}`, 'ctx', 'ko', (i % 10) + 1, null, null, nowMs(), i % 5, null);
    }),
  );

  const masteredQuery = db.prepare(`
    SELECT * FROM mastered_sentences
    WHERE user_id = ? AND language_code = ?
    ORDER BY mastered_at DESC
  `);
  metrics.push(
    measureLoop('mastered_sentences by user/language', cfg.users, (i) => {
      masteredQuery.all(uid('u', i), 'ko');
    }),
  );

  const delVocabulary = db.prepare(`DELETE FROM vocabulary WHERE id = ?`);
  metrics.push(
    measureLoop('vocabulary delete', totalVocabulary, (i) => {
      const u = i % cfg.users;
      delVocabulary.run(uid('v', u, i));
    }),
  );

  return metrics;
}

function buildSummary(constraintChecks, crudMetrics, schemaCheck) {
  const failedConstraints = constraintChecks.filter((x) => !x.pass);
  const pass = schemaCheck.pass && failedConstraints.length === 0;
  return {
    pass,
    schema: schemaCheck,
    constraints: constraintChecks,
    metrics: crudMetrics,
  };
}

function persistReport(report) {
  const outDir = path.join(process.cwd(), 'docs', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `db-layer-report-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  return outFile;
}

function printMetric(m) {
  console.log(
    `- ${m.label}: count=${m.count}, total=${m.totalMs}ms, avg=${m.avgMs}ms, p95=${m.p95Ms}ms, ops/s=${m.opsPerSec}`,
  );
}

function main() {
  const scale = parseScaleArg();
  const cfg = getConfig(scale);
  const { db, dbFile } = createTestDb();

  const startedAt = performance.now();
  try {
    createSchema(db);
    const schemaCheck = runSchemaChecks(db);
    const constraints = runConstraintChecks(db);
    const crudMetrics = runCrudBenchmarks(db, cfg);
    const totalMs = performance.now() - startedAt;

    const report = {
      name: 'DB Layer Standalone Test',
      timestamp: new Date().toISOString(),
      scale,
      config: cfg,
      sqlite: {
        dbFile,
        journalMode: db.pragma('journal_mode', { simple: true }),
        foreignKeys: db.pragma('foreign_keys', { simple: true }),
      },
      ...buildSummary(constraints, crudMetrics, schemaCheck),
      totalMs: Number(totalMs.toFixed(3)),
    };

    const reportFile = persistReport(report);
    console.log(`\n[DB-LAYER] scale=${scale} total=${report.totalMs}ms`);
    console.log(`[DB-LAYER] schema pass=${report.schema.pass}`);
    console.log(`[DB-LAYER] constraints pass=${report.constraints.every((c) => c.pass)}`);
    report.constraints.forEach((c) => {
      console.log(`  - ${c.name}: ${c.pass ? 'PASS' : 'FAIL'}${c.detail ? ` | ${JSON.stringify(c.detail)}` : ''}`);
    });
    console.log('[DB-LAYER] metrics:');
    report.metrics.forEach(printMetric);
    console.log(`[DB-LAYER] report: ${reportFile}`);

    if (!report.pass) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[DB-LAYER] test failed:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
