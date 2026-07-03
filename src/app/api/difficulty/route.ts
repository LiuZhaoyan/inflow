import { NextResponse } from 'next/server';
import { getProgress, setDifficultyLevel } from '@/lib/db';
import { getLevelLabel } from '@/lib/domain/learn/difficulty-engine';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

/**
 * GET /api/difficulty
 * Returns current difficulty level, label, user level, and learning stats
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
                weakAreas: Object.entries(progress.learningProfile?.grammarStatus ?? {})
                    .filter(([, level]) => Number(level) < 0)
                    .map(([point]) => point),
                grammarStatus: progress.learningProfile?.grammarStatus ?? {},
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
 * Manually adjust difficulty level
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
        if (typeof level !== 'number' || level < 1 || level > 10) {
            return NextResponse.json({ error: 'Level must be between 1 and 10' }, { status: 400 });
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
