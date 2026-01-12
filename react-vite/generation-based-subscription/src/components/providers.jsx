import { FlowgladProvider } from '@flowglad/react';
import { authClient } from '../lib/auth-client';

export function FlowgladProviderWrapper({ children }) {
  const { data: session, isPending } = authClient.useSession();

  // Only load billing when user is signed in
  // Authentication is handled via Better Auth session cookies on the backend
  const loadBilling = !isPending && !!session?.user;

  return (
    <FlowgladProvider 
      loadBilling={loadBilling}
      requestConfig={{
        // Enable credentials for auth cookies
        withCredentials: true, // Flowglad SDK uses withCredentials for XMLHttpRequest-style config
      }}
    >
      {children}
    </FlowgladProvider>
  );
}

