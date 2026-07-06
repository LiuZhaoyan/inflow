import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/ai/client';
import { getProgress, setPlacementResult, getUserProfile } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/core/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

/**
 * POST /api/placement-test
 * 
 * Body: { action: 'start' | 'answer', languageCode?: string, questionIndex?: number, understood?: boolean, answers?: Array<{ understood: boolean }> }
 *
 * Flow:
 *   1. Client calls with action='start' → API returns 5 placement sentences of varying difficulty
 *   2. Client shows each sentence, user marks understood or not
 *   3. Client calls with action='answer' + answers[] → API computes level and saves
 */

const PLACEMENT_LEVELS = [1, 3, 5, 7, 9]; // initial calibration anchors

export async function POST(req: Request) {
    const startTime = Date.now();
    const endpoint = 'POST /api/placement-test';
    let userId: string | undefined;
    try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;
        userId = user.id;

        const body = await req.json();
        const { action, languageCode, answers } = body;

        const userProfile = await getUserProfile(userId);
        const requestedLanguage = normalizeLanguageCode(languageCode);
        const fallback = userProfile?.currentLanguageCode || userProfile?.targetLanguage || 'ko';
        const targetLanguage = requestedLanguage === 'auto' ? fallback : requestedLanguage;
        const nativeLanguage = userProfile?.nativeLanguage || 'en';

        if (action === 'start') {
            // Ask AI to generate 5 sentences at initial calibration anchors.
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `You are a language assessment tool. Generate exactly 5 sentences in the target language at different initial calibration anchors for a placement test.

Target Language Code: ${targetLanguage}
User Native Language Code: ${nativeLanguage}

Generate one sentence for each calibration anchor: 1 (foundation), 3 (early flow), 5 (building flow), 7 (expanding flow), 9 (nuanced flow).

RESPONSE FORMAT:
Return a valid JSON array (no markdown). Each element:
{
  "level": <one of 1, 3, 5, 7, 9>,
  "sentence": "<sentence in target language>",
  "translation": "<translation in ${nativeLanguage}>"
}

Make sure:
- Anchor 1: very basic greeting or single concept (e.g. "Hello" equivalent)
- Anchor 3: simple daily sentence with basic grammar
- Anchor 5: compound sentence with past/future tense
- Anchor 7: complex sentence with subordinate clauses or idioms
- Anchor 9: sophisticated expression with nuanced vocabulary or cultural references`
                },
                {
                    role: 'user',
                    content: 'Generate the 5 placement test sentences now.'
                }
            ];

            const aiRes = await chatCompletion(messages, { temperature: 0.8, maxTokens: 600 });
            let sentences;
            try {
                const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
                sentences = JSON.parse(cleaned);
            } catch {
                // Fallback: return a basic set
                sentences = PLACEMENT_LEVELS.map(level => ({
                    level,
                    sentence: `[Placement sentence anchor ${level}]`,
                    translation: `[Translation for anchor ${level}]`,
                }));
            }

            return NextResponse.json({ sentences });
        }

        if (action === 'answer') {
            // answers: [{ level: number, understood: boolean }]
            if (!Array.isArray(answers) || answers.length === 0) {
                return NextResponse.json({ error: 'Missing answers array' }, { status: 400 });
            }

            // Find the highest level the user understood
            const understood = answers
                .filter((a: { level: number; understood: boolean }) => a.understood)
                .map((a: { level: number }) => a.level);

            let computedLevel: number;
            if (understood.length === 0) {
                computedLevel = 1;
            } else {
                const maxUnderstood = Math.max(...understood);
                // Start slightly above the highest understood calibration anchor.
                computedLevel = maxUnderstood + 1;
            }

            await setPlacementResult(computedLevel, userId, targetLanguage);

            return NextResponse.json({
                level: computedLevel,
                message: `Your starting challenge index has been set to ${computedLevel}.`,
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

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
 * GET /api/placement-test
 * Returns whether placement has been completed and current level
 */
export async function GET() {
    const startTime = Date.now();
    const endpoint = 'GET /api/placement-test';
    let userId: string | undefined;
    try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;
        userId = user.id;

        const progress = await getProgress(undefined, user.id);
        return NextResponse.json({
            completed: progress.placementCompleted ?? false,
            level: progress.currentDifficultyLevel ?? 3,
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
