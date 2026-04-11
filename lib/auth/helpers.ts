import { auth } from './index';
import { NextResponse } from 'next/server';
import { getBypassUser, isAuthBypassEnabled } from './mode';
import { ensureUserExistsById, getUserProfile } from '@/lib/db';

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type UserWithRole = User & {
  role: 'user' | 'admin';
};

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

/**
 * Get authenticated user with role information.
 * Use when role-based access control is needed.
 */
export async function getAuthenticatedUserWithRole(): Promise<{
  user: UserWithRole | null;
  errorResponse: NextResponse | null;
}> {
  const { user, errorResponse } = await getAuthenticatedUser();
  if (errorResponse) {
    return { user: null, errorResponse };
  }

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }

  try {
    const profile = await getUserProfile(user.id);
    const role = (profile?.role as 'user' | 'admin') || 'user';
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      errorResponse: null,
    };
  } catch {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Failed to load user profile' },
        { status: 500 },
      ),
    };
  }
}

/**
 * Check if user has admin role.
 * Use for admin-only endpoints.
 */
export async function requireAdminRole(): Promise<{
  user: UserWithRole | null;
  errorResponse: NextResponse | null;
}> {
  const { user, errorResponse } = await getAuthenticatedUserWithRole();
  if (errorResponse) {
    return { user: null, errorResponse };
  }

  if (user?.role !== 'admin') {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 },
      ),
    };
  }

  return { user, errorResponse: null };
}
