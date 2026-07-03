import { NextResponse } from 'next/server';
import { getProgress, deleteMasteredSentence } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

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
    const normalized = normalizeLanguageCode(languageCodeParam || undefined);
    const progress = await getProgress(normalized === 'auto' ? undefined : normalized, user.id);
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
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

    const normalized = normalizeLanguageCode(languageCode || undefined);
    const progress = await deleteMasteredSentence(
      id,
      user.id,
      normalized === 'auto' ? undefined : normalized,
    );
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
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
