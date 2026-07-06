import { NextResponse } from 'next/server';
import { getProgress, setDifficultyLevel } from '@/lib/db';
import { getLevelLabel } from '@/lib/domain/learn/difficulty-engine';
import { isValidChallengeIndex } from '@/lib/domain/learn/challenge-index';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

/**
 * GET /api/difficulty
 * Returns the current adaptive challenge index, label, and learning stats.
 */
export async function GET(req: Request) {
    const startTime = Date.now();
    const endpoint = 'GET /api/difficulty';
    let userId: string | undefined;
    try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;
        userId = user.id;

        const url = new URL(req.url);
        const requested = normalizeLanguageCode(url.searchParams.get('languageCode') || undefined);
        const progress = await getProgress(requested === 'auto' ? undefined : requested, user.id);
        const level = progress.currentDifficultyLevel ?? 3;

        return NextResponse.json({
            level,
            label: getLevelLabel(level),
            placementCompleted: progress.placementCompleted ?? false,
            stats: {
                totalMastered: progress.masteredSentences?.length ?? 0,
                supportTerms: progress.learningProfile?.supportTerms ?? [],
                recentComprehension: progress.learningProfile?.recentComprehension,
                learningPace: progress.learningProfile?.learningPace ?? 'normal',
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

/**
 * PUT /api/difficulty
 * Manually adjust adaptive challenge index.
 * Body: { level: number }
 */
export async function PUT(req: Request) {
    const startTime = Date.now();
    const endpoint = 'PUT /api/difficulty';
    let userId: string | undefined;
    try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;
        userId = user.id;

        const { level } = await req.json();
        if (!isValidChallengeIndex(level)) {
            return NextResponse.json({ error: 'Level must be a finite integer greater than or equal to 1' }, { status: 400 });
        }

        const url = new URL(req.url);
        const requested = normalizeLanguageCode(url.searchParams.get('languageCode') || undefined);

        const newLevel = await setDifficultyLevel(level, user.id, requested === 'auto' ? undefined : requested);
        return NextResponse.json({
            level: newLevel,
            label: getLevelLabel(newLevel),
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
