import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { logger, anonymizeUserId } from '@/lib/core/logger';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'learn-chat-perf.jsonl');
const LOG_TAG = '[learn-chat:perf]';

type LearnChatPerfLogLevel = 'info' | 'warn' | 'error';

export interface LearnChatPerfLogEntry {
  level?: LearnChatPerfLogLevel;
  stage: string;
  endpoint: string;
  requestId?: string;
  userId?: string;
  action?: string;
  targetLanguage?: string;
  stageMs?: number;
  totalMs?: number;
  [key: string]: unknown;
}

let ensureLogDirPromise: Promise<void> | null = null;

function ensureLogDir(): Promise<void> {
  if (!ensureLogDirPromise) {
    ensureLogDirPromise = mkdir(LOG_DIR, { recursive: true }).then(() => undefined);
  }
  return ensureLogDirPromise;
}

function sanitizeEntry(entry: LearnChatPerfLogEntry): LearnChatPerfLogEntry {
  return {
    ...entry,
    ...(entry.userId && { userId: anonymizeUserId(entry.userId) }),
  };
}

function shouldMirrorToConsole(): boolean {
  return process.env.LEARN_CHAT_PERF_LOG_CONSOLE === 'true';
}

export function writeLearnChatPerfLog(entry: LearnChatPerfLogEntry): void {
  const safeEntry = sanitizeEntry(entry);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    tag: LOG_TAG,
    level: safeEntry.level ?? 'info',
    ...safeEntry,
  });

  void ensureLogDir()
    .then(() => appendFile(LOG_FILE, `${line}\n`, 'utf8'))
    .catch((error) => {
      logger.warn('Failed to write learn-chat perf log', {
        endpoint: entry.endpoint,
        requestId: entry.requestId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

  if (shouldMirrorToConsole()) {
    logger.info(`${LOG_TAG} ${entry.stage}`, safeEntry);
  }
}
