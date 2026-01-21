import { FlowgladProvider } from '@flowglad/react';
import { authClient } from '../lib/auth-client';

interface FlowgladProviderWrapperProps {
  children: React.ReactNode;
}
export function FlowgladProviderWrapper({ children }:FlowgladProviderWrapperProps) {
  const { data: session, isPending } = authClient.useSession();

  // Only load billing when user is signed in
  // Authentication is handled via Better Auth session cookies on the backend
  const loadBilling = !isPending && !!session?.user;

  return (
    <FlowgladProvider loadBilling={loadBilling}>
      {children}
    </FlowgladProvider>
  );
}

