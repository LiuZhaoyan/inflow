/*
 Learn chat history cleanup utility.

 Supports two cleanup modes:
 1) context-all: delete all chat_messages under language+context scope.
 2) legacy-only: delete only legacy user rows that do not have user_action.

 Usage examples:
   node scripts/cleanup_learn_chat_history.js --mode legacy-only --lang ja --context "Daily Conversation" --dry-run
   node scripts/cleanup_learn_chat_history.js --mode legacy-only --lang ja --context "Daily Conversation" --confirm

   node scripts/cleanup_learn_chat_history.js --mode context-all --lang ja --context "Daily Conversation" --dry-run
   node scripts/cleanup_learn_chat_history.js --mode context-all --lang ja --context "Daily Conversation" --confirm

 Optional:
   --user-id <id>    limit cleanup to a specific user
   --db <path>       custom sqlite path (default: ./data/inflow.db)
*/

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function printHelp() {
  console.log(`
Learn chat cleanup script

Required:
  --mode <legacy-only|context-all>
  --lang <language_code>
  --context <context>

Action flags (choose one):
  --dry-run   preview affected rows (default)
  --confirm   execute deletion

Optional:
  --user-id <id>
  --db <path>

Examples:
  node scripts/cleanup_learn_chat_history.js --mode legacy-only --lang ja --context "Daily Conversation" --dry-run
  node scripts/cleanup_learn_chat_history.js --mode legacy-only --lang ja --context "Daily Conversation" --confirm
  node scripts/cleanup_learn_chat_history.js --mode context-all --lang ja --context "Daily Conversation" --confirm --user-id <USER_ID>
`);
}

function parseArgs(argv) {
  const raw = argv.slice(2);
  const out = {
    mode: '',
    lang: '',
    context: '',
    userId: '',
    dbPath: path.join(process.cwd(), 'data', 'inflow.db'),
    confirm: false,
    dryRun: true,
    help: false,
  };

  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];

    if (token === '--help' || token === '-h') {
      out.help = true;
      continue;
    }

    if (token === '--confirm') {
      out.confirm = true;
      out.dryRun = false;
      continue;
    }

    if (token === '--dry-run') {
      out.dryRun = true;
      out.confirm = false;
      continue;
    }

    if (token === '--mode') {
      out.mode = (raw[i + 1] || '').trim();
      i += 1;
      continue;
    }

    if (token === '--lang') {
      out.lang = (raw[i + 1] || '').trim();
      i += 1;
      continue;
    }

    if (token === '--context') {
      out.context = (raw[i + 1] || '').trim();
      i += 1;
      continue;
    }

    if (token === '--user-id') {
      out.userId = (raw[i + 1] || '').trim();
      i += 1;
      continue;
    }

    if (token === '--db') {
      const input = (raw[i + 1] || '').trim();
      out.dbPath = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
      i += 1;
      continue;
    }
  }

  return out;
}

function validateArgs(args) {
  if (!args.mode || !['legacy-only', 'context-all'].includes(args.mode)) {
    return 'Invalid or missing --mode. Use legacy-only or context-all.';
  }
  if (!args.lang) return 'Missing --lang.';
  if (!args.context) return 'Missing --context.';
  return null;
}

function buildWhereClause(args) {
  const clauses = [
    'language_code = @lang',
    'context = @context',
  ];

  if (args.userId) {
    clauses.push('user_id = @userId');
  }

  if (args.mode === 'legacy-only') {
    clauses.push("role = 'user'");
    clauses.push('user_action IS NULL');
  }

  return clauses.join(' AND ');
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  const validationError = validateArgs(args);
  if (validationError) {
    console.error('[ERROR]', validationError);
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(args.dbPath)) {
    console.error('[ERROR] Database file not found:', args.dbPath);
    process.exit(1);
  }

  const db = new Database(args.dbPath);
  db.pragma('foreign_keys = ON');

  try {
    const where = buildWhereClause(args);
    const params = {
      lang: args.lang,
      context: args.context,
      userId: args.userId || undefined,
    };

    const countSql = `SELECT COUNT(*) AS c FROM chat_messages WHERE ${where}`;
    const previewSql = `
      SELECT id, user_id, role, user_action, content, created_at
      FROM chat_messages
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const deleteSql = `DELETE FROM chat_messages WHERE ${where}`;

    const count = db.prepare(countSql).get(params).c;
    const sampleRows = db.prepare(previewSql).all(params);

    console.log('[INFO] DB:', args.dbPath);
    console.log('[INFO] Mode:', args.mode);
    console.log('[INFO] Scope:', JSON.stringify({
      lang: args.lang,
      context: args.context,
      userId: args.userId || null,
    }));
    console.log('[INFO] Matched rows:', count);

    if (sampleRows.length > 0) {
      console.log('[INFO] Sample rows (max 20):');
      for (const row of sampleRows) {
        const preview = typeof row.content === 'string' ? row.content.slice(0, 120) : '';
        console.log(`  - ${row.id} | user=${row.user_id} | role=${row.role} | user_action=${row.user_action || 'NULL'} | ${preview}`);
      }
    }

    if (!args.confirm) {
      console.log('[DRY-RUN] No rows deleted. Re-run with --confirm to execute deletion.');
      return;
    }

    const tx = db.transaction(() => {
      const result = db.prepare(deleteSql).run(params);
      return result.changes || 0;
    });

    const deleted = tx();
    console.log('[DONE] Deleted rows:', deleted);
  } finally {
    db.close();
  }
}

main();
