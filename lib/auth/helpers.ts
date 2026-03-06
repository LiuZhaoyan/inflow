import { auth } from './index';
import { NextResponse } from 'next/server';
import { getBypassUser, isAuthBypassEnabled } from './mode';
import { ensureUserExistsById } from '@/lib/db';

/**
 * Get the authenticated user from the current session.
 * Use in API routes to enforce authentication.
 */
export async function getAuthenticatedUser() {
  if (isAuthBypassEnabled()) {
    const bypassUser = getBypassUser();
    await ensureUserExistsById({
      id: bypassUser.id,
      email: bypassUser.email,
      name: bypassUser.name,
    });
    return { user: bypassUser, errorResponse: null };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }
  return { user: session.user, errorResponse: null };
}
