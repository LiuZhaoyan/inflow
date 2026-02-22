export function isAuthBypassEnabled() {
  return process.env.AUTH_BYPASS === 'true';
}

export function getBypassUser() {
  return {
    id: process.env.AUTH_BYPASS_USER_ID || 'test-user',
    email: process.env.AUTH_BYPASS_USER_EMAIL || 'test-user@local.dev',
    name: process.env.AUTH_BYPASS_USER_NAME || 'Test User',
  };
}
