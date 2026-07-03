'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

type ProvidersProps = {
  children: ReactNode;
  session?: Session | null;
  isBypass?: boolean;
};

export default function Providers({ children, session, isBypass = false }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SessionProvider
        session={session}
        refetchOnWindowFocus={!isBypass}
        refetchInterval={0}
        refetchWhenOffline={false}
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}
