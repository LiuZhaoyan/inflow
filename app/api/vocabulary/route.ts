import { NextResponse } from 'next/server';
import {
  getVocabularyByUser,
  addWordByUser,
  deleteWordByUser,
  updateWordByUser,
  getUserProfile,
} from '@/lib/db';
import { chatCompletion, type ChatMessage } from '@/lib/aiClient';
import { detectLanguageFromSentences } from '@/lib/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { logger } from '@/lib/logger';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Internal Server Error';
}

async function generateDefinition(word: string, nativeLanguage: string): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          `You are a language teacher. Write two short, clear definitions for the word.\n` +
          `1) Definition in the same language as the word. Keep line under 10 words.\n` +
          `2) Translate the word into the learner's native language: "${nativeLanguage}". No explanations.\n` +
          `Output exactly two lines separated by a newline.  Avoid quotes and extra punctuation.`,
      },
      {
        role: 'user',
        content: `Word: ${word}`,
      },
    ];

    const definition = await chatCompletion(messages, {
      model: 'deepseek/deepseek-v3.2',
      temperature: 0.5,
      maxTokens: 60,
    });

    return (definition || '').trim();
  } catch (err) {
    logger.error('Definition generation failed', {
      error: err instanceof Error ? err : new Error(String(err)),
      endpoint: 'POST /api/vocabulary',
      word,
    });
    return '';
  }
}

export async function GET(request: Request) {
  const { user, errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const vocab = await getVocabularyByUser(user.id);
  const url = new URL(request.url);
  const languageCode = (url.searchParams.get('languageCode') || '').trim().toLowerCase();
  if (!languageCode || languageCode === 'all') {
    return NextResponse.json(vocab);
  }
  return NextResponse.json(vocab.filter(w => (w.language || '') === languageCode));
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const wordData = await request.json();
    if (!wordData.word) {
       return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    if (!wordData.language || String(wordData.language).trim() === '') {
      const hint = detectLanguageFromSentences([
        wordData.word || '',
        wordData.contextSentence || '',
      ]);
      if (hint.code !== 'auto') {
        wordData.language = hint.code;
      }
    }

    if (!wordData.definition || String(wordData.definition).trim() === '') {
      const profile = await getUserProfile(user.id);
      const nativeLanguage = profile?.nativeLanguage || 'en';
      const generated = await generateDefinition(wordData.word, nativeLanguage);
      if (generated) {
        wordData.definition = generated;
      }
    }
    const newWord = await addWordByUser(user.id, wordData);
    return NextResponse.json(newWord);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id, ...updates } = await request.json();
    if (!id) {
       return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    const updatedWord = await updateWordByUser(user.id, id, updates);
    if (!updatedWord) {
       return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }
    return NextResponse.json(updatedWord);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { user, errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    await deleteWordByUser(user.id, id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
}
