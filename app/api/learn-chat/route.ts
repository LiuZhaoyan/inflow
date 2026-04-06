import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/aiClient';
import { logger } from '@/lib/logger';
import {
    getProgress,
    getUserProfile,
    getChatMessageByRequestId,
    saveMasteredSentence,
    setDifficultyLevel,
    updateProgress,
    getChatHistory,
    saveChatMessage,
} from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';
import { requestTtsPersistent } from '@/lib/ttsService';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import {
    calculateDifficultyContext,
    computeNewDifficultyLevel,
    buildPersonalizationPrompt,
    updateLearningProfileFromAction,
} from '@/lib/difficultyEngine';
import {
    buildLearnChatContextMessages,
    mapActionTexts,
} from '@/lib/learnChatMessageProtocol';
import type { LearnAction } from '@/lib/types/learnChat';

function isRateLimitError(error: unknown) {
    const err = error as {
        status?: number;
        code?: string;
        response?: { status?: number; data?: { error?: { code?: string } } };
        cause?: { status?: number; response?: { status?: number } };
    };
    const status =
        err?.status ||
        err?.response?.status ||
        err?.cause?.status ||
        err?.cause?.response?.status;

    const code = err?.code || err?.response?.data?.error?.code;

    return status === 429 || code === 'rate_limit' || code === 'rate_limited';
}

interface ParsedAiResponse {
    response?: string;
    type?: 'sentence' | 'explanation' | 'translation';
    original?: string;
    difficultyEstimate?: number;
    difficulty?: {
        level: number;
        direction: 'decrease' | 'maintain' | 'increase';
        performance: 'struggling' | 'learning' | 'comfortable' | 'excellent';
    };
    messageId?: string;
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/learn-chat';
  let userId: string | undefined;
  let requestIdValue: string | undefined;

  try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;

        userId = user.id;
        const { action, requestId, currentSentence, context: rawContext, messageId, languageCode } = await req.json();
    const learnAction = action as LearnAction;
    const stableRequestId = typeof requestId === 'string' && requestId.trim() ? requestId.trim() : undefined;
    requestIdValue = stableRequestId;
    const context = typeof rawContext === 'string' && rawContext.trim() ? rawContext.trim() : 'General';
    const userProfile = await getUserProfile(userId);
    const requestedLanguage = normalizeLanguageCode(languageCode);
    const fallbackLanguage = userProfile?.currentLanguageCode || userProfile?.targetLanguage || 'ko';
    const targetLanguage = requestedLanguage === 'auto' ? fallbackLanguage : requestedLanguage;
    const nativeLanguage = userProfile?.nativeLanguage || 'en';
    const progress = await getProgress(targetLanguage, userId);
    const history = await getChatHistory(userId, targetLanguage, context, 20);
    const historyForDifficulty = history.map((msg) => ({ role: msg.role, content: msg.content }));

    // Calculate difficulty context from progress + learning profile + history
    const difficultyCtx = calculateDifficultyContext(progress, progress.learningProfile, historyForDifficulty);
    const personalizationBlock = buildPersonalizationPrompt(difficultyCtx);

    const systemPrompt = `You are a personalized language tutor. 
Target Language Code: ${targetLanguage}
User Native Language Code: ${nativeLanguage}
User Level: ${difficultyCtx.levelLabel}
Selected Context: ${context || 'None'}

Your goal is to help the user learn by providing ONE sentence at a time.
Verify user understanding. Adjust difficulty based on feedback.

CONTEXT RULES:
- If Selected Context is not 'None', all sentences and explanations must stay strictly within that context.
- Do not drift to unrelated topics. If unsure, keep it generic but still within the selected context.

${personalizationBlock}

PROTOCOL:
1. If action is 'init': Output a simple greeting and the first practice sentence in the target language. Match the sentence to the current difficulty level.
2. If action is 'explain': Provide a brief explanation of key vocabulary or grammar in the 'currentSentence' using the native language. Tailor explanation depth to the user's level.
3. If action is 'translate': Provide the translation of 'currentSentence' in the user's native language.
4. If action is 'understand': The user understood 'currentSentence'. Output a NEW sentence. It can be a variation or a logical follow-up. Follow the difficulty adjustment direction.

RESPONSE FORMAT:
You MUST return a valid JSON object. Do not include markdown formatting (like \`\`\`json).
Structure:
{
  "response": "The content to display to the user (the explanation, translation, or the NEW sentence)",
  "type": "sentence" | "explanation" | "translation",
  "original": "If type is explanation/translation, keep the original sentence here. If type is sentence, put the new sentence here.",
  "difficultyEstimate": <number 1-10 estimating the difficulty of the sentence you generated>
}
`;

    // Filter history to keep context manageable
    const messages: ChatMessage[] = buildLearnChatContextMessages(systemPrompt, history, 10);
    const actionTexts = mapActionTexts(learnAction, currentSentence, context, difficultyCtx.currentLevel);

    if (learnAction !== 'init') {
        const existingMessage = stableRequestId
            ? await getChatMessageByRequestId(userId, stableRequestId)
            : null;

        if (!existingMessage) {
            await saveChatMessage(userId, {
                languageCode: targetLanguage,
                context,
                role: 'user',
                requestId: stableRequestId,
                content: actionTexts.displayText,
                userAction: learnAction,
            });
        }
    }

    if (learnAction === 'understand') {

        // ── Update difficulty level ──
        const newLevel = computeNewDifficultyLevel(progress.currentDifficultyLevel ?? 3, difficultyCtx);
        if (newLevel !== (progress.currentDifficultyLevel ?? 3)) {
            await setDifficultyLevel(newLevel, userId, targetLanguage);
        }

        // ── Update learning profile ──
        const updatedProfile = updateLearningProfileFromAction(
            progress.learningProfile ?? {
                knownVocabulary: [], weakVocabulary: {}, masteredGrammar: [],
                strugglingGrammar: [], preferredContexts: [], learningPace: 'normal',
                totalSentencesMastered: 0, totalStudyTimeMs: 0, lastUpdated: Date.now(),
            },
            learnAction,
            currentSentence || '',
            historyForDifficulty,
        );
        // Track preferred context
        if (context && !updatedProfile.preferredContexts.includes(context)) {
            updatedProfile.preferredContexts.push(context);
            if (updatedProfile.preferredContexts.length > 5) {
                updatedProfile.preferredContexts.shift();
            }
        }

        await updateProgress({
            learningProfile: updatedProfile,
            currentDifficultyLevel: newLevel,
            lastUpdated: Date.now(),
        }, userId, targetLanguage);

        if (currentSentence) {
            let audioPath: string | undefined;
            try {
                audioPath = await requestTtsPersistent(currentSentence, {
                    voiceId: 'audiobook_female_1',
                    speed: 1.0
                }, userId);
            } catch {
                logger.warn('Auto-TTS failed for mastered sentence', {
                    requestId: stableRequestId,
                    userId,
                    endpoint,
                });
            }

            await saveMasteredSentence({
                id: Date.now().toString(),
                content: currentSentence,
                masteredAt: Date.now(),
                difficultyLevel: difficultyCtx.currentLevel,
                audioPath,
                context,
                messageId,
                languageCode: targetLanguage
            }, userId, targetLanguage);
        }
    }

    // For explain/translate actions, also update learning profile
    if (learnAction === 'explain' || learnAction === 'translate') {
        const updatedProfile = updateLearningProfileFromAction(
            progress.learningProfile ?? {
                knownVocabulary: [], weakVocabulary: {}, masteredGrammar: [],
                strugglingGrammar: [], preferredContexts: [], learningPace: 'normal',
                totalSentencesMastered: 0, totalStudyTimeMs: 0, lastUpdated: Date.now(),
            },
            learnAction,
            currentSentence || '',
            historyForDifficulty,
        );
        await updateProgress({ learningProfile: updatedProfile, lastUpdated: Date.now() }, userId, targetLanguage);
    }

    messages.push({ role: 'user', content: actionTexts.modelText });
    logger.info('AI chat completion initiated', {
        requestId: stableRequestId,
        userId,
        endpoint,
        action: learnAction,
    });

    const aiRes = await chatCompletion(messages, {
        temperature: 0.7
    });
    logger.info('AI response received', {
        requestId: stableRequestId,
        userId,
        endpoint,
    });

    let data: ParsedAiResponse;
    try {
        const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        data = JSON.parse(cleaned) as ParsedAiResponse;
    } catch {
        logger.warn('AI response JSON parsing failed, falling back to plain text', {
            requestId: stableRequestId,
            userId,
            endpoint,
        });
        data = {
            response: aiRes,
            type: 'explanation',
            original: currentSentence
        };
    }

    const aiMessage = await saveChatMessage(userId, {
        languageCode: targetLanguage,
        context,
        role: 'ai',
        content: data.response || '',
        messageType: data.type,
        originalSentence: data.original,
        difficultyEstimate: typeof data.difficultyEstimate === 'number' ? data.difficultyEstimate : undefined,
    });

    // Include current difficulty info in response
    const latestProgress = await getProgress(targetLanguage, userId);
    data.difficulty = {
        level: latestProgress.currentDifficultyLevel ?? 3,
        direction: difficultyCtx.direction,
        performance: difficultyCtx.performance,
    };
    data.messageId = aiMessage.id;

    const durationMs = Date.now() - startTime;
    logger.info('Learn Chat completed successfully', {
        requestId: requestIdValue || stableRequestId,
        userId,
        endpoint,
        statusCode: 200,
        durationMs,
    });

    return NextResponse.json(data);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        let statusCode = 500;

        if (isRateLimitError(error)) {
            statusCode = 429;
            logger.warn('Learn Chat rate limit exceeded', {
                requestId: requestIdValue,
                userId,
                endpoint,
                statusCode,
                durationMs,
            });
            return NextResponse.json(
                    { error: 'Rate limited' },
                    { status: 429, headers: { 'Retry-After': '10' } }
            );
        }

        logger.error('Learn Chat error', {
            requestId: requestIdValue,
            userId,
            endpoint,
            statusCode,
            durationMs,
            ...(error instanceof Error && { error }),
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
