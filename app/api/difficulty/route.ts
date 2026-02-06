import { NextResponse } from 'next/server';
import { getProgress, setDifficultyLevel } from '@/lib/db';
import { getLevelLabel } from '@/lib/difficultyEngine';

/**
 * GET /api/difficulty
 * Returns current difficulty level, label, user level, and learning stats
 */
export async function GET() {
    try {
        const progress = await getProgress();
        const level = progress.currentDifficultyLevel ?? 3;

        return NextResponse.json({
            level,
            label: getLevelLabel(level),
            placementCompleted: progress.placementCompleted ?? false,
            stats: {
                totalMastered: progress.masteredSentences?.length ?? 0,
                knownVocabulary: progress.learningProfile?.knownVocabulary?.length ?? 0,
                weakAreas: progress.learningProfile?.strugglingGrammar ?? [],
                learningPace: progress.learningProfile?.learningPace ?? 'normal',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/difficulty
 * Manually adjust difficulty level
 * Body: { level: number }
 */
export async function PUT(req: Request) {
    try {
        const { level } = await req.json();
        if (typeof level !== 'number' || level < 1 || level > 10) {
            return NextResponse.json({ error: 'Level must be between 1 and 10' }, { status: 400 });
        }

        const newLevel = await setDifficultyLevel(level);
        return NextResponse.json({
            level: newLevel,
            label: getLevelLabel(newLevel),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
