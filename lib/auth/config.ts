import type { NextAuthConfig } from 'next-auth';
import { isAuthBypassEnabled } from './mode';

/** Routes that don't require authentication */
const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Base auth configuration — safe for Edge Runtime (no Node.js / native deps).
 * Used by middleware and extended by the full auth config.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // Added in the full config (lib/auth/index.ts)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (isAuthBypassEnabled()) {
        return true;
      }

      const isLoggedIn = !!auth?.user;
      const isPublic = isPublicPath(nextUrl.pathname);

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // Allow public paths
      if (isPublic) return true;

      // Require login for everything else
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
