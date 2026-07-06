import { NextResponse } from 'next/server';
import { deleteMasteredSentence, getMasteredSentencesByUser } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

function normalizeMasteredSentenceLanguage(languageCode?: string | null): string | undefined {
  const raw = (languageCode || '').trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'unknown') return 'unknown';
  const normalized = normalizeLanguageCode(raw);
  return normalized === 'auto' ? undefined : normalized;
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const endpoint = 'GET /api/mastered-sentences';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const url = new URL(req.url);
    const languageCodeParam = url.searchParams.get('languageCode');
    const limit = Number(url.searchParams.get('limit') || 0);
    const cursor = url.searchParams.get('cursor') || undefined;
    const normalized = normalizeMasteredSentenceLanguage(languageCodeParam);
    const sentences = await getMasteredSentencesByUser(user.id, {
      languageCode: normalized,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      cursor,
    });
    return NextResponse.json({ sentences });
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
  const endpoint = 'DELETE /api/mastered-sentences';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { id, languageCode } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing sentence id' }, { status: 400 });
    }

    const normalized = normalizeMasteredSentenceLanguage(languageCode);
    await deleteMasteredSentence(
      id,
      user.id,
      normalized,
    );
    const sentences = await getMasteredSentencesByUser(user.id, {
      languageCode: normalized,
    });
    return NextResponse.json({ sentences });
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
