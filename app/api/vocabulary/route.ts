import { NextResponse } from 'next/server';
import { getVocabulary, addWord, deleteWord, updateWord, VocabularyWord } from '@/lib/db';

export async function GET() {
  const vocab = await getVocabulary();
  return NextResponse.json(vocab);
}

export async function POST(request: Request) {
  try {
    const wordData = await request.json();
    if (!wordData.word) {
       return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }
    const newWord = await addWord(wordData);
    return NextResponse.json(newWord);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) {
       return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    const updatedWord = await updateWord(id, updates);
    if (!updatedWord) {
       return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }
    return NextResponse.json(updatedWord);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    await deleteWord(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
}
