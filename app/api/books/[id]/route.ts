import { NextResponse } from 'next/server';
import { deleteBook } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await deleteBook(id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Book not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: result.deleted });
}


