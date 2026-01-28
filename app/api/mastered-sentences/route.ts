import { NextResponse } from 'next/server';
import { getProgress, deleteMasteredSentence } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';

export async function GET(req: Request) {
  try {
    const progress = await getProgress();
    const url = new URL(req.url);
    const languageCodeParam = url.searchParams.get('languageCode');
    const normalized = normalizeLanguageCode(languageCodeParam || undefined);
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, languageCode } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing sentence id' }, { status: 400 });
    }

    const progress = await deleteMasteredSentence(id);
    const normalized = normalizeLanguageCode(languageCode || undefined);
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete sentence' }, { status: 500 });
  }
}
