import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/aiClient';
import { detectLanguageHint, resolveLanguageLabel, normalizeLanguageCode } from '@/lib/language';

export async function POST(request: Request) {
  try {
    const { words } = await request.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'List of words is required' }, { status: 400 });
    }

    const wordsString = words.join(', ');

    // Detect language from the provided words and enforce it strictly in the prompt
    const { code } = detectLanguageHint(wordsString);
    const langCode = normalizeLanguageCode(code);
    const langLabel = resolveLanguageLabel(langCode);

    const systemPrompt = `You are a creative writing assistant for language learners.
  Strictly use ${langLabel} in your response. Do not mix other languages.
  If a provided word is in a different script, keep that word as-is but write all surrounding text in ${langLabel}.`;

    const userPrompt = `Write a short story strictly in ${langLabel} using these words: ${wordsString}.
  Highlight the used words by wrapping them in **bold** (markdown).
  Keep the story short, engaging, and entirely in ${langLabel}.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const story = await chatCompletion(messages, {
      temperature: 0.8,
      maxTokens: 1000 // Allow enough length for a story
    });

    return NextResponse.json({ story });

  } catch (error: any) {
    console.error('Story Generation Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate story' },
      { status: 500 }
    );
  }
}
