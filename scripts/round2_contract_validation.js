const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'data', 'inflow.db');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function check(name, condition, detail, bucket) {
  bucket.push({ name, pass: Boolean(condition), detail });
}

function runStaticChecks() {
  const userTs = read('lib/db/user.ts');
  const progressTs = read('lib/db/progress.ts');
  const schemaTs = read('lib/db/schema.ts');
  const booksTs = read('lib/db/books.ts');

  const checks = [];

  check(
    'user.getUserProfile unknown user returns null',
    /export async function getUserProfile\(userId: string\): Promise<UserProfile \| null>;/.test(userTs)
      && /return null;\s*}\s*export async function updateUserProfile/s.test(userTs),
    'Overload and function tail indicate unknown user no longer auto-created.',
    checks,
  );

  check(
    'user.updateUserProfile guards missing user',
    /if \(!current\) \{\s*throw new Error\(`User not found: \$\{userId\}`\);\s*}/s.test(userTs),
    'Missing user path is explicit error, avoiding implicit lifecycle mutation.',
    checks,
  );

  check(
    'progress.resolveLanguageCode requires userId',
    /async function resolveLanguageCode\(userId: string, languageCode\?: string\)/.test(progressTs),
    'Language fallback now tied to caller user context.',
    checks,
  );

  check(
    'progress call sites pass userId',
    !/resolveLanguageCode\(\)/.test(progressTs)
      && !/resolveLanguageCode\(languageCode\)/.test(progressTs),
    'No legacy no-user fallback invocation remains.',
    checks,
  );

  check(
    'progress ensure row uses conflict handling',
    /onConflictDoNothing\(\{\s*target: \[learningProgress\.userId, learningProgress\.languageCode\],\s*}\)/s.test(progressTs),
    'Insert path is idempotent under concurrent init.',
    checks,
  );

  check(
    'schema adds user-language unique index',
    /uniqueIndex\('learning_progress_user_id_language_code_unique'\)\.on\(\s*table\.userId,\s*table\.languageCode,/s.test(schemaTs),
    'Composite uniqueness defined in schema layer.',
    checks,
  );

  check(
    'books visibility contract includes public+owned',
    /where\(or\(eq\(books\.userId, userId\), isNull\(books\.userId\)\)\)/.test(booksTs),
    'User bookshelf query includes own books and shared/public books.',
    checks,
  );

  check(
    'books.getBookById remains id-only (risk noted)',
    /export async function getBookById\(id: string\)[\s\S]*?\.where\(eq\(books\.id, id\)\)/.test(booksTs),
    'Current function still lacks user boundary by design (DBR-004 pending).',
    checks,
  );

  return checks;
}

function runRuntimeChecks() {
  const checks = [];
  if (!fs.existsSync(DB_PATH)) {
    check('database exists', false, `DB file missing: ${DB_PATH}`, checks);
    return checks;
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  try {
    const indexes = db.prepare("PRAGMA index_list('learning_progress')").all();
    const hasUnique = indexes.some((idx) => idx.name === 'learning_progress_user_id_language_code_unique' && idx.unique === 1);
    check(
      'runtime unique index present',
      hasUnique,
      `Found indexes: ${indexes.map((i) => `${i.name}:${i.unique}`).join(', ')}`,
      checks,
    );

    const uid = `round2-${randomUUID()}`;
    const now = Date.now();
    db.prepare(
      'INSERT INTO users (id,email,password_hash,username,native_language,target_language,current_language_code,is_onboarded,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ).run(uid, `${uid}@local`, '', 'round2', 'en', 'ja', 'ja', 0, now, now);

    db.prepare(
      'INSERT INTO learning_progress (id,user_id,language_code,current_difficulty_level,initial_difficulty_level,placement_completed,last_updated) VALUES (?,?,?,?,?,?,?)',
    ).run(randomUUID(), uid, 'ja', 3, 3, 0, now);

    let duplicateBlocked = false;
    try {
      db.prepare(
        'INSERT INTO learning_progress (id,user_id,language_code,current_difficulty_level,initial_difficulty_level,placement_completed,last_updated) VALUES (?,?,?,?,?,?,?)',
      ).run(randomUUID(), uid, 'ja', 4, 3, 0, now);
    } catch {
      duplicateBlocked = true;
    }

    const count = db
      .prepare('SELECT COUNT(*) AS c FROM learning_progress WHERE user_id = ? AND language_code = ?')
      .get(uid, 'ja').c;

    check(
      'runtime duplicate pair blocked',
      duplicateBlocked && count === 1,
      `duplicateBlocked=${duplicateBlocked}, rowCount=${count}`,
      checks,
    );

    const u1 = `round2-b1-${randomUUID()}`;
    const u2 = `round2-b2-${randomUUID()}`;
    db.prepare(
      'INSERT INTO users (id,email,password_hash,username,native_language,target_language,current_language_code,is_onboarded,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ).run(u1, `${u1}@local`, '', 'u1', 'en', 'ko', 'ko', 0, now, now);
    db.prepare(
      'INSERT INTO users (id,email,password_hash,username,native_language,target_language,current_language_code,is_onboarded,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ).run(u2, `${u2}@local`, '', 'u2', 'en', 'ko', 'ko', 0, now, now);

    const bOwn = `round2-book-own-${randomUUID()}`;
    const bOther = `round2-book-other-${randomUUID()}`;
    const bPublic = `round2-book-public-${randomUUID()}`;

    const insertBook = db.prepare(
      'INSERT INTO books (id,user_id,title,level,language,metadata,content_path,preview,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    );

    insertBook.run(bOwn, u1, 'own', 'A1', 'ko', null, null, '[]', now);
    insertBook.run(bOther, u2, 'other', 'A1', 'ko', null, null, '[]', now);
    insertBook.run(bPublic, null, 'public', 'A1', 'ko', null, null, '[]', now);

    const visibleToU1 = db
      .prepare('SELECT id FROM books WHERE user_id = ? OR user_id IS NULL')
      .all(u1)
      .map((r) => r.id);

    const visibilityPass = visibleToU1.includes(bOwn) && visibleToU1.includes(bPublic) && !visibleToU1.includes(bOther);
    check(
      'runtime books visibility contract',
      visibilityPass,
      `visibleToU1=${JSON.stringify(visibleToU1)}`,
      checks,
    );

    db.prepare('DELETE FROM books WHERE id IN (?,?,?)').run(bOwn, bOther, bPublic);
    db.prepare('DELETE FROM learning_progress WHERE user_id IN (?,?,?)').run(uid, u1, u2);
    db.prepare('DELETE FROM users WHERE id IN (?,?,?)').run(uid, u1, u2);
  } finally {
    db.close();
  }

  return checks;
}

function summarize(staticChecks, runtimeChecks) {
  const all = [...staticChecks, ...runtimeChecks];
  const failed = all.filter((c) => !c.pass);
  return {
    ok: failed.length === 0,
    total: all.length,
    passed: all.length - failed.length,
    failed: failed.length,
    staticChecks,
    runtimeChecks,
  };
}

function main() {
  const staticChecks = runStaticChecks();
  const runtimeChecks = runRuntimeChecks();
  const report = summarize(staticChecks, runtimeChecks);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
