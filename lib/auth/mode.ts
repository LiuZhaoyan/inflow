export function isAuthBypassEnabled() {
  return process.env.AUTH_BYPASS === 'true';
}

export type BypassUser = {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
};

export function getBypassUser(): BypassUser {
  const role = process.env.AUTH_BYPASS_USER_ROLE as 'user' | 'admin' | undefined;
  return {
    id: process.env.AUTH_BYPASS_USER_ID || 'test-user',
    email: process.env.AUTH_BYPASS_USER_EMAIL || 'test-user@local.dev',
    name: process.env.AUTH_BYPASS_USER_NAME || 'Test User',
    role: role || 'user',
  };
}
