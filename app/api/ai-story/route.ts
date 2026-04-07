import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/ai/client';
import { detectLanguageHint, resolveLanguageLabel, normalizeLanguageCode } from '@/lib/core/language';
import { addStoryByUser } from '@/lib/db';
import { getUserProfile } from '@/lib/db/user';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { logger } from '@/lib/core/logger';
import { handleApiError } from '@/lib/core/error-handler';

export async function POST(request: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/ai-story';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { words } = await request.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'List of words is required' }, { status: 400 });
    }

    const wordsString = words.join(', ');

    // Detect language from the provided words and enforce it strictly in the prompt
    const { code } = detectLanguageHint(wordsString);
    const langCode = normalizeLanguageCode(code);
    const langLabel = resolveLanguageLabel(langCode);
    const userProfile = await getUserProfile(user.id);
    const translationLangCode = normalizeLanguageCode(userProfile.nativeLanguage);
    const translationLangLabel = resolveLanguageLabel(translationLangCode);

    const systemPrompt = `You are a creative writing assistant for language learners.
Story Language: ${langLabel}
Translation Language: ${translationLangLabel}
Provided Words: ${wordsString}

Your goal is to generate a short, simple, and engaging story for learners.
Maintain strict language control and highlight target vocabulary.

CONSTRAINTS:
- Write the story strictly in ${langLabel}.
- Write the translation strictly in ${translationLangLabel}.
- If a provided word uses a different script, keep it exactly as-is in the story.
- Highlight used words in the story with **bold** markdown.
- Highlight the translated forms of those words in the translation with **bold** markdown.

PROTOCOL:
1. Use every provided word at least once.
2. Keep the story short and coherent.
3. Keep sentences easy to read.

RESPONSE FORMAT:
Return ONLY valid JSON, no extra text and no markdown fences.
Structure:
{
  "story": "...",
  "translation": "..."
}
`;

    const userPrompt = `Write a short story using the provided words.
Ensure the story and translation follow the constraints and response format exactly.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const rawResponse = await chatCompletion(messages, {
      temperature: 0.8,
      maxTokens: 1000 // Allow enough length for a story
    });

    let story = '';
    let translation = '';
    try {
      const parsed = JSON.parse(rawResponse || '{}') as { story?: string; translation?: string };
      story = parsed.story || '';
      translation = parsed.translation || '';
    } catch (parseError) {
      logger.error('Story JSON Parse Error', {
        error: parseError instanceof Error ? parseError : new Error(String(parseError)),
        endpoint: 'POST /api/ai-story',
        response: rawResponse,
      });
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
    }

    const saved = await addStoryByUser(user.id, {
      content: story || '',
      translation: translation || '',
      words,
      language: langCode === 'auto' ? undefined : langCode,
      translationLanguage: translationLangCode === 'auto' ? undefined : translationLangCode,
    });

    return NextResponse.json({ story, translation, saved });

  } catch (error: unknown) {
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
