export default function About() {
  // Server-side redirect: keep /about as legacy entrypoint, but serve docs at /docs
  // (This matches the message shown on the docs page.)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { redirect } = require('next/navigation') as typeof import('next/navigation');
  redirect('/docs');
}

