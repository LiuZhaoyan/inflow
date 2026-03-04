import { NextResponse } from 'next/server';
import { getVocabularyByUser, getBooksByUser, getProgress, getStoriesByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const [vocabulary, books, progress, stories] = await Promise.all([
      getVocabularyByUser(user.id),
      getBooksByUser(user.id),
      getProgress(undefined, user.id),
      getStoriesByUser(user.id),
    ]);

    const vocabByLanguage: Record<string, number> = {};
    vocabulary.forEach(w => {
      const lang = w.language || 'unknown';
      vocabByLanguage[lang] = (vocabByLanguage[lang] || 0) + 1;
    });

    const sentencesByLanguage: Record<string, number> = {};
    (progress.masteredSentences || []).forEach(s => {
      const lang = s.languageCode || 'unknown';
      sentencesByLanguage[lang] = (sentencesByLanguage[lang] || 0) + 1;
    });

    return NextResponse.json({
      vocabulary: {
        total: vocabulary.length,
        byLanguage: vocabByLanguage,
      },
      sentences: {
        total: (progress.masteredSentences || []).length,
        byLanguage: sentencesByLanguage,
      },
      books: {
        total: books.length,
      },
      stories: {
        total: stories.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch profile stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
