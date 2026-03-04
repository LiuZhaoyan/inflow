import { NextResponse } from 'next/server';
import { deleteAllBooksByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function DELETE() {
  const { user, errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const result = await deleteAllBooksByUser(user.id);
  return NextResponse.json(result);
}


