import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getProgress, getUserProfile, updateProgress } from '@/lib/db';
import {
  calculateDifficultyContext,
  computeNewDifficultyLevel,
  updateLearningProfileFromFeedback,
} from '@/lib/domain/learn/difficulty-engine';
import type { ComprehensionRating } from '@/lib/types/learnTypes';

function isComprehensionRating(value: unknown): value is ComprehensionRating {
  return value === 'too_hard' || value === 'just_right' || value === 'too_easy';
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/learn-feedback';
  let userId: string | undefined;

  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const body = await req.json();
    const rating = body?.rating;
    const sentence = typeof body?.sentence === 'string' ? body.sentence.trim() : '';
    if (!isComprehensionRating(rating)) {
      return NextResponse.json({ error: 'rating must be too_hard, just_right, or too_easy' }, { status: 400 });
    }
    if (!sentence) {
      return NextResponse.json({ error: 'sentence is required' }, { status: 400 });
    }

    const userProfile = await getUserProfile(user.id);
    const requestedLanguage = normalizeLanguageCode(body?.languageCode);
    const fallbackLanguage = userProfile?.currentLanguageCode || userProfile?.targetLanguage || 'ko';
    const targetLanguage = requestedLanguage === 'auto' ? fallbackLanguage : requestedLanguage;

    const progress = await getProgress(targetLanguage, user.id);
    const updatedProfile = updateLearningProfileFromFeedback(
      progress.learningProfile,
      rating,
      sentence,
    );

    const updatedContext = calculateDifficultyContext(
      {
        ...progress,
        learningProfile: updatedProfile,
      },
      updatedProfile,
      [],
    );
    const nextLevel = computeNewDifficultyLevel(progress.currentDifficultyLevel ?? 3, updatedContext);

    await updateProgress({
      learningProfile: updatedProfile,
      currentDifficultyLevel: nextLevel,
      lastUpdated: Date.now(),
    }, user.id, targetLanguage);

    return NextResponse.json({
      learningProfileUpdated: true,
      difficulty: {
        level: nextLevel,
        direction: updatedContext.direction,
        performance: updatedContext.performance,
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
