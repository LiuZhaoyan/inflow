import { NextResponse } from 'next/server';
import { clearChatHistory, getChatHistory } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { normalizeLanguageCode } from '@/lib/core/language';
import { handleApiError } from '@/lib/core/error-handler';

function parseLimit(raw: string | null): number {
  const value = Number(raw || '50');
  if (!Number.isFinite(value) || value <= 0) return 50;
  return Math.min(200, Math.floor(value));
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const endpoint = 'GET /api/chat-history';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const url = new URL(req.url);
    const lang = normalizeLanguageCode(url.searchParams.get('lang') || undefined);
    const context = (url.searchParams.get('context') || '').trim();

    if (lang === 'auto' || !context) {
      return NextResponse.json(
        { error: 'lang and context are required' },
        { status: 400 },
      );
    }

    const limit = parseLimit(url.searchParams.get('limit'));
    const before = Number(url.searchParams.get('before') || '');
    const cursor = Number.isFinite(before) && before > 0 ? before : undefined;

    const messages = await getChatHistory(user.id, lang, context, limit, cursor);
    return NextResponse.json({
      messages,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  const endpoint = 'DELETE /api/chat-history';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { languageCode, context } = await req.json();
    const lang = normalizeLanguageCode(languageCode || undefined);
    const safeContext = typeof context === 'string' ? context.trim() : '';

    if (lang === 'auto' || !safeContext) {
      return NextResponse.json(
        { error: 'languageCode and context are required' },
        { status: 400 },
      );
    }

    await clearChatHistory(user.id, lang, safeContext);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}
