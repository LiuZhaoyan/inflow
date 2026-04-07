import { NextResponse } from 'next/server';
import { deleteAllBooksByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/errorHandler';

export const runtime = 'nodejs';

export async function DELETE() {
  const startTime = Date.now();
  const endpoint = 'DELETE /api/books';
  let userId: string | undefined;

  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    userId = user.id;
    const result = await deleteAllBooksByUser(user.id);
    return NextResponse.json(result);
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


