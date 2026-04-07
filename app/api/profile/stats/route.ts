import { NextResponse } from 'next/server';
import { getVocabularyByUser, getBooksByUser, getProgress, getStoriesByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

export async function GET() {
  const startTime = Date.now();
  const endpoint = 'GET /api/profile/stats';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const [vocabulary, books, progress, stories] = await Promise.all([
      getVocabularyByUser(user.id),
      getBooksByUser(user.id),
      getProgress(undefined, user.id),
      getStoriesByUser(user.id),
    ]);

    const vocabByLanguage: Record<string, number> = {};
    vocabulary.forEach(w => {
      const lang = w.language || 'unknown';
      vocabByLanguage[lang] = (vocabByLanguage[lang] || 0) + 1;
    });

    const sentencesByLanguage: Record<string, number> = {};
    (progress.masteredSentences || []).forEach(s => {
      const lang = s.languageCode || 'unknown';
      sentencesByLanguage[lang] = (sentencesByLanguage[lang] || 0) + 1;
    });

    return NextResponse.json({
      vocabulary: {
        total: vocabulary.length,
        byLanguage: vocabByLanguage,
      },
      sentences: {
        total: (progress.masteredSentences || []).length,
        byLanguage: sentencesByLanguage,
      },
      books: {
        total: books.length,
      },
      stories: {
        total: stories.length,
      },
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
