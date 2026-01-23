import { NextResponse } from 'next/server';
import { getProgress, deleteMasteredSentence } from '@/lib/db';

export async function GET() {
  try {
    const progress = await getProgress();
    return NextResponse.json({ sentences: progress.masteredSentences || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing sentence id' }, { status: 400 });
    }

    const progress = await deleteMasteredSentence(id);
    return NextResponse.json({ sentences: progress.masteredSentences || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete sentence' }, { status: 500 });
  }
}
