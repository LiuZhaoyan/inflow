import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.svg
     * - uploads/ (public media files)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon\\.svg|uploads/).*)',
  ],
};