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
    // For auth bypass users, use the role from the bypass configuration directly
    if (isAuthBypassEnabled()) {
      const bypassUser = getBypassUser();
      const role = (bypassUser.role as 'user' | 'admin') || 'user';
      console.log('[DEBUG] getAuthenticatedUserWithRole (bypass):', { userId: user.id, role });
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
        },
        errorResponse: null,
      };
    }

    // For normal session users, fetch role from database
    const profile = await getUserProfile(user.id);
    console.log('[DEBUG] getUserProfile result:', { userId: user.id, profile });
    const role = (profile?.role as 'user' | 'admin') || 'user';
    console.log('[DEBUG] Resolved role:', { userId: user.id, role, profileRole: profile?.role });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      errorResponse: null,
    };
  } catch (error) {
    console.error('[DEBUG] Error in getAuthenticatedUserWithRole:', error);
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

  console.log('[DEBUG] requireAdminRole - checking user:', { userId: user?.id, role: user?.role });
  if (user?.role !== 'admin') {
    console.log('[DEBUG] requireAdminRole - DENIED:', { userId: user?.id, role: user?.role });
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 },
      ),
    };
  }

  console.log('[DEBUG] requireAdminRole - ALLOWED:', { userId: user?.id, role: user?.role });
  return { user, errorResponse: null };
}
