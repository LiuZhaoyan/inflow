import { NextResponse } from 'next/server';
import { getProgress, deleteMasteredSentence } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const url = new URL(req.url);
    const languageCodeParam = url.searchParams.get('languageCode');
    const normalized = normalizeLanguageCode(languageCodeParam || undefined);
    const progress = await getProgress(normalized === 'auto' ? undefined : normalized, user.id);
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id, languageCode } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing sentence id' }, { status: 400 });
    }

    const normalized = normalizeLanguageCode(languageCode || undefined);
    const progress = await deleteMasteredSentence(
      id,
      user.id,
      normalized === 'auto' ? undefined : normalized,
    );
    const sentences = progress.masteredSentences || [];
    const filtered = normalized === 'auto'
      ? sentences
      : sentences.filter(s => (s.languageCode || '') === normalized);
    return NextResponse.json({ sentences: filtered });
  } catch {
    return NextResponse.json({ error: 'Failed to delete sentence' }, { status: 500 });
  }
}
