import { NextResponse } from 'next/server';
import {
  getMasteredSentenceStatsByUser,
  getStoryStatsByUser,
  getVocabularyStatsByUser,
} from '@/lib/db';
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

    const [vocabulary, sentences, stories] = await Promise.all([
      getVocabularyStatsByUser(user.id),
      getMasteredSentenceStatsByUser(user.id),
      getStoryStatsByUser(user.id),
    ]);

    return NextResponse.json({
      vocabulary: {
        total: vocabulary.total,
        byLanguage: vocabulary.byLanguage,
      },
      sentences: {
        total: sentences.total,
        byLanguage: sentences.byLanguage,
      },
      stories: {
        total: stories.total,
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
