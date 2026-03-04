import { NextResponse } from 'next/server';
import { deleteBookByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const { id } = await ctx.params;
  const result = await deleteBookByUser(user.id, id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Book not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: result.deleted });
}


