import { and, desc, eq, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection';
import { chatMessages } from './schema';
import type { LearnAction } from '@/lib/types/learnChat';

export interface ChatHistoryMessage {
  id: string;
  userId: string;
  languageCode: string;
  context: string;
  role: string;
  requestId?: string;
  userAction?: LearnAction;
  content: string;
  messageType?: string;
  originalSentence?: string;
  difficultyEstimate?: number;
  createdAt: number;
}

export interface NewChatMessage {
  languageCode: string;
  context: string;
  role: string;
  requestId?: string;
  userAction?: LearnAction;
  content: string;
  messageType?: string;
  originalSentence?: string;
  difficultyEstimate?: number;
  createdAt?: number;
}

function toMillis(value: Date | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function mapRow(row: typeof chatMessages.$inferSelect): ChatHistoryMessage {
  return {
    id: row.id,
    userId: row.userId,
    languageCode: row.languageCode,
    context: row.context,
    role: row.role,
    requestId: row.requestId || undefined,
    userAction: (row.userAction as LearnAction | null) || undefined,
    content: row.content,
    messageType: row.messageType || undefined,
    originalSentence: row.originalSentence || undefined,
    difficultyEstimate: row.difficultyEstimate ?? undefined,
    createdAt: toMillis(row.createdAt),
  };
}

export async function getChatHistory(
  userId: string,
  languageCode: string,
  context: string,
  limit: number = 50,
  before?: number,
): Promise<ChatHistoryMessage[]> {
  const constraints = [
    eq(chatMessages.userId, userId),
    eq(chatMessages.languageCode, languageCode),
    eq(chatMessages.context, context),
  ];

  if (before) {
    constraints.push(lt(chatMessages.createdAt, new Date(before)));
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(...constraints))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  return rows.map(mapRow).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveChatMessage(
  userId: string,
  message: NewChatMessage,
): Promise<ChatHistoryMessage> {
  const [created] = await db
    .insert(chatMessages)
    .values({
      id: uuidv4(),
      userId,
      languageCode: message.languageCode,
      context: message.context,
      role: message.role,
      requestId: message.requestId,
      userAction: message.userAction,
      content: message.content,
      messageType: message.messageType,
      originalSentence: message.originalSentence,
      difficultyEstimate: message.difficultyEstimate,
      createdAt: new Date(message.createdAt || Date.now()),
    })
    .returning();

  return mapRow(created);
}

export async function getChatMessageByRequestId(
  userId: string,
  requestId: string,
): Promise<ChatHistoryMessage | null> {
  const [row] = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.requestId, requestId)))
    .limit(1);

  return row ? mapRow(row) : null;
}

export async function clearChatHistory(
  userId: string,
  languageCode: string,
  context: string,
): Promise<void> {
  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.languageCode, languageCode),
        eq(chatMessages.context, context),
      ),
    );
}

export async function deleteChatMessagesBySentence(
  userId: string,
  sentence: string,
): Promise<number> {
  const result = await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.originalSentence, sentence),
      ),
    );
  return result.changes;
}
