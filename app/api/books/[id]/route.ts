import { NextResponse } from 'next/server';
import { deleteBookByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const endpoint = 'DELETE /api/books/[id]';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { id } = await ctx.params;
    const result = await deleteBookByUser(user.id, id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: 'Book not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}


