import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/aiClient';
import {
    getProgress,
    getUserProfile,
    saveMasteredSentence,
    setDifficultyLevel,
    updateProgress,
    getChatHistory,
    saveChatMessage,
} from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';
import { generateTTS } from '@/lib/ttsService';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import {
    calculateDifficultyContext,
    computeNewDifficultyLevel,
    buildPersonalizationPrompt,
    updateLearningProfileFromAction,
} from '@/lib/difficultyEngine';

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

type HistoryEntry = { role?: string; content?: string };

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

function buildContextMessages(systemPrompt: string, history: HistoryEntry[], limit = 10): ChatMessage[] {
    const safeHistory = Array.isArray(history) ? history : [];
    const filtered: HistoryEntry[] = [];

    for (let i = 0; i < safeHistory.length - 1; i += 1) {
        const current = safeHistory[i];
        const next = safeHistory[i + 1];
        if (current?.content === 'I got it!' && next?.content) {
            filtered.push(next);
        }
    }

    return [
        { role: 'system', content: systemPrompt },
        ...filtered.slice(-limit)
            .map((h) => {
                let role: 'user' | 'system' | 'assistant' = 'user';
                if (h.role === 'ai') role = 'assistant';
                else if (h.role === 'system') role = 'system';
                else if (h.role === 'user') role = 'user';
                // fallback to 'user' if undefined or any other value
                return {
                    role,
                    content: h.content || ''
                };
            })
    ];
}

function mapActionToUserContent(action: string, currentSentence?: string, context?: string, level?: number) {
    if (action === 'init') {
        return context
            ? `Start the session. The user chose the context: "${context}". Generate a sentence relevant to this context at difficulty level ${level ?? 3}/10.`
            : `Start the session. Generate a sentence at difficulty level ${level ?? 3}/10.`;
    }

    if (action === 'explain') {
        return `Explain this sentence: "${currentSentence || ''}"`;
    }

    if (action === 'translate') {
        return `Translate this sentence: "${currentSentence || ''}"`;
    }

    return `I understand this sentence: "${currentSentence || ''}". Give me the next one at the appropriate difficulty level.`;
}

export async function POST(req: Request) {
  try {
        const { user, errorResponse } = await getAuthenticatedUser();
        if (errorResponse) return errorResponse;

        const { action, currentSentence, context: rawContext, messageId, languageCode } = await req.json();
    const userId = user.id;
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
    const messages: ChatMessage[] = buildContextMessages(systemPrompt, history, 10);
    const userContent = mapActionToUserContent(action, currentSentence, context, difficultyCtx.currentLevel);

    if (action !== 'init') {
        await saveChatMessage(userId, {
            languageCode: targetLanguage,
            context,
            role: 'user',
            content: userContent,
        });
    }

    if (action === 'understand') {

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
            action,
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
                audioPath = await generateTTS(currentSentence, {
                    voiceId: 'audiobook_female_1',
                    speed: 1.0
                }, userId);
            } catch (err) {
                console.error("Auto-TTS failed for mastered sentence:", err);
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
    if (action === 'explain' || action === 'translate') {
        const updatedProfile = updateLearningProfileFromAction(
            progress.learningProfile ?? {
                knownVocabulary: [], weakVocabulary: {}, masteredGrammar: [],
                strugglingGrammar: [], preferredContexts: [], learningPace: 'normal',
                totalSentencesMastered: 0, totalStudyTimeMs: 0, lastUpdated: Date.now(),
            },
            action,
            currentSentence || '',
            historyForDifficulty,
        );
        await updateProgress({ learningProfile: updatedProfile, lastUpdated: Date.now() }, userId, targetLanguage);
    }

    messages.push({ role: 'user', content: userContent });
    console.log("Learn Chat Messages:", messages);

    const aiRes = await chatCompletion(messages, {
        temperature: 0.7
    });
    console.log("Learn Chat AI Response:", aiRes);

    let data: ParsedAiResponse;
    try {
        const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        data = JSON.parse(cleaned) as ParsedAiResponse;
    } catch {
        console.error("JSON parse error", aiRes);
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

    return NextResponse.json(data);

    } catch (error) {
        console.error('Learn Chat Error:', error);
        if (isRateLimitError(error)) {
                return NextResponse.json(
                        { error: 'Rate limited' },
                        { status: 429, headers: { 'Retry-After': '10' } }
                );
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
