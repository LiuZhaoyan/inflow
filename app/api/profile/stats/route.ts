import { NextResponse } from 'next/server';
import { getVocabulary, getBooks, getProgress, getStories } from '@/lib/db';

export async function GET() {
  try {
    const [vocabulary, books, progress, stories] = await Promise.all([
      getVocabulary(),
      getBooks(),
      getProgress(),
      getStories(),
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
