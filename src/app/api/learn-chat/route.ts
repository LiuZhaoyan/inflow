import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/ai/client';
import { logger } from '@/lib/core/logger';
import {
    getProgress,
    getUserProfile,
    getChatMessageByRequestId,
    saveMasteredSentence,
    updateMasteredSentenceAudioPath,
    updateProgress,
    getChatHistory,
    saveChatMessage,
    getVocabularyByUser,
} from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/core/language';
import { requestTtsPersistent } from '@/lib/media/tts-service';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import {
    calculateDifficultyContext,
    computeNewDifficultyLevel,
    buildPersonalizationPrompt,
    updateLearningProfileFromAction,
} from '@/lib/domain/learn/difficulty-engine';
import {
    buildLearnChatContextMessages,
    mapActionTexts,
} from '@/lib/domain/learn/message-protocol';
import {
    getLearnChatMaxTokens,
    scheduleMasteredSentenceTts,
} from '@/lib/domain/learn/learn-chat-performance';
import { writeLearnChatPerfLog } from '@/lib/domain/learn/learn-chat-perf-logger';
import type { LearnAction } from '@/lib/types/learnChat';
import { handleApiError } from '@/lib/core/error-handler';

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
    iPlusOne?: {
        challengeType?: 'vocabulary' | 'grammar' | 'register' | 'sentence_pattern';
        challengeLabel?: string;
        familiarAnchors?: string[];
    };
}

interface LearnChatPerfContext {
    endpoint: string;
    requestId?: string;
    userId?: string;
    action?: LearnAction;
    targetLanguage?: string;
}

function countMessageChars(messages: ChatMessage[]): number {
    return messages.reduce((sum, message) => sum + message.content.length, 0);
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/learn-chat';
  const perfContext: LearnChatPerfContext = { endpoint };
  let lastPerfMark = startTime;
  let userId: string | undefined;
  let requestIdValue: string | undefined;

  const logLearnChatPerf = (stage: string, extra: Record<string, unknown> = {}) => {
    const now = Date.now();
    writeLearnChatPerfLog({
        ...perfContext,
        stage,
        stageMs: now - lastPerfMark,
        totalMs: now - startTime,
        ...extra,
    });
    lastPerfMark = now;
  };

  try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;

        userId = user.id;
        const { action, requestId, currentSentence, context: rawContext, messageId, languageCode } = await req.json();
    const learnAction = action as LearnAction;
    const stableRequestId = typeof requestId === 'string' && requestId.trim() ? requestId.trim() : undefined;
    requestIdValue = stableRequestId;
    perfContext.userId = userId;
    perfContext.requestId = stableRequestId;
    perfContext.action = learnAction;
    logLearnChatPerf('auth_and_parse');
    const context = typeof rawContext === 'string' && rawContext.trim() ? rawContext.trim() : 'General';
    const userProfile = await getUserProfile(userId);
    const requestedLanguage = normalizeLanguageCode(languageCode);
    const fallbackLanguage = userProfile?.currentLanguageCode || userProfile?.targetLanguage || 'ko';
    const targetLanguage = requestedLanguage === 'auto' ? fallbackLanguage : requestedLanguage;
    perfContext.targetLanguage = targetLanguage;
    const nativeLanguage = userProfile?.nativeLanguage || 'en';
    const progress = await getProgress(targetLanguage, userId);
    const history = await getChatHistory(userId, targetLanguage, context, 20);
    const vocabulary = await getVocabularyByUser(userId, {
        languageCode: targetLanguage,
        limit: 20,
    });
    const historyForDifficulty = history.map((msg) => ({ role: msg.role, content: msg.content }));
    logLearnChatPerf('load_profile_progress_history', {
        context,
        historyCount: history.length,
        vocabularyCount: vocabulary.length,
        masteredSentenceCount: progress.masteredSentences.length,
        currentDifficultyLevel: progress.currentDifficultyLevel,
    });

    // Calculate difficulty context from progress + learning profile + history
    const difficultyCtx = calculateDifficultyContext(progress, progress.learningProfile, historyForDifficulty);
    let responseDifficultyCtx = difficultyCtx;
    const personalizationBlock = buildPersonalizationPrompt(difficultyCtx, {
        vocabularyTerms: vocabulary.map((word) => word.word).filter(Boolean),
        masteredSentences: progress.masteredSentences
            .slice(0, 10)
            .map((sentence) => sentence.content)
            .filter(Boolean),
    });

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
1. If action is 'init': Output a simple greeting and the first practice sentence in the target language. Match the sentence to the current adaptive i+1 guidance.
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
  "difficultyEstimate": <integer estimating the adaptive challenge index of the sentence you generated>,
  "iPlusOne": {
    "challengeType": "vocabulary" | "grammar" | "register" | "sentence_pattern",
    "challengeLabel": "short label for the single main +1 challenge",
    "familiarAnchors": ["known words or sentence patterns reused"]
  }
}
`;

    // Filter history to keep context manageable
    const messages: ChatMessage[] = buildLearnChatContextMessages(systemPrompt, history, 10);
    const actionTexts = mapActionTexts(learnAction, currentSentence, context, difficultyCtx.currentLevel);
    logLearnChatPerf('build_prompt', {
        promptChars: systemPrompt.length,
        messageCount: messages.length,
        messageChars: countMessageChars(messages),
    });

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
        logLearnChatPerf('save_user_action', {
            dedupedByRequestId: Boolean(existingMessage),
        });
    }

    if (learnAction === 'understand') {

        // Update the learner profile first so a single Got it records just_right
        // without bypassing the conservative i+1 growth rules.
        const updatedProfile = updateLearningProfileFromAction(
            progress.learningProfile,
            learnAction,
            currentSentence || '',
        );
        const updatedDifficultyCtx = calculateDifficultyContext(
            {
                ...progress,
                learningProfile: updatedProfile,
            },
            updatedProfile,
            historyForDifficulty,
        );
        const newLevel = computeNewDifficultyLevel(progress.currentDifficultyLevel ?? 3, updatedDifficultyCtx);
        responseDifficultyCtx = updatedDifficultyCtx;

        await updateProgress({
            learningProfile: updatedProfile,
            currentDifficultyLevel: newLevel,
            lastUpdated: Date.now(),
        }, userId, targetLanguage);

        if (currentSentence) {
            const sentenceId = uuidv4();

            const savedSentence = await saveMasteredSentence({
                id: sentenceId,
                content: currentSentence,
                masteredAt: Date.now(),
                difficultyLevel: difficultyCtx.currentLevel,
                context,
                messageId,
                languageCode: targetLanguage
            }, userId, targetLanguage);

            scheduleMasteredSentenceTts({
                sentenceId: savedSentence?.id || sentenceId,
                sentence: currentSentence,
                userId,
                languageCode: targetLanguage,
                requestId: stableRequestId,
                endpoint,
            }, {
                requestTtsPersistent,
                updateMasteredSentenceAudioPath,
                warn: (message, meta) => {
                    logger.warn(message, meta);
                },
            });
        }
        logLearnChatPerf('understand_db_updates', {
            savedMasteredSentence: Boolean(currentSentence),
        });
    }

    // For explain/translate actions, also update learning profile
    if (learnAction === 'explain' || learnAction === 'translate') {
        const updatedProfile = updateLearningProfileFromAction(
            progress.learningProfile,
            learnAction,
            currentSentence || '',
        );
        await updateProgress({ learningProfile: updatedProfile, lastUpdated: Date.now() }, userId, targetLanguage);
        logLearnChatPerf('aux_profile_update');
    }

    messages.push({ role: 'user', content: actionTexts.modelText });
    const maxTokens = getLearnChatMaxTokens(learnAction);
    logger.info('AI chat completion initiated', {
        requestId: stableRequestId,
        userId,
        endpoint,
        action: learnAction,
        maxTokens,
    });

    const aiRes = await chatCompletion(messages, {
        temperature: 0.7,
        maxTokens,
    });
    logLearnChatPerf('ai_completion', {
        model: 'deepseek/deepseek-v3.2',
        maxTokens,
        messageCount: messages.length,
        messageChars: countMessageChars(messages),
        responseChars: aiRes.length,
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
    logLearnChatPerf('parse_ai_json', {
        responseType: data.type,
        responseChars: data.response?.length ?? 0,
    });

    const aiMessage = await saveChatMessage(userId, {
        languageCode: targetLanguage,
        context,
        role: 'ai',
        content: data.response || '',
        messageType: data.type,
        originalSentence: data.original,
        difficultyEstimate: typeof data.difficultyEstimate === 'number' ? data.difficultyEstimate : undefined,
    });
    logLearnChatPerf('save_ai_message', {
        aiMessageId: aiMessage.id,
    });

    // Include current difficulty info in response
    const latestProgress = await getProgress(targetLanguage, userId);
    logLearnChatPerf('latest_progress', {
        latestDifficultyLevel: latestProgress.currentDifficultyLevel,
        latestMasteredSentenceCount: latestProgress.masteredSentences.length,
    });
    data.difficulty = {
        level: latestProgress.currentDifficultyLevel ?? 3,
        direction: responseDifficultyCtx.direction,
        performance: responseDifficultyCtx.performance,
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
    logLearnChatPerf('total', {
        statusCode: 200,
        durationMs,
    });

    return NextResponse.json(data);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        logLearnChatPerf('error', {
            statusCode: 500,
            durationMs,
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return handleApiError(error, {
            endpoint,
            userId,
            requestId: requestIdValue,
            statusCode: 500,
            durationMs,
            originalError: error instanceof Error ? error : undefined,
        });
    }
}
