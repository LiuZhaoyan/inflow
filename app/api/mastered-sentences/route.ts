import { NextResponse } from 'next/server';
import { getProgress } from '@/lib/db';

export async function GET() {
  try {
    const progress = await getProgress();
    return NextResponse.json({ sentences: progress.masteredSentences || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
