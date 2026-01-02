import { NextResponse } from 'next/server';
import { deleteAllBooks } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE() {
  const result = await deleteAllBooks();
  return NextResponse.json(result);
}


