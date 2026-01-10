import { FlowgladProvider } from '@flowglad/react';
import { useUser } from '@clerk/clerk-react';

export function FlowgladProviderWrapper({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  // Only load billing when user is signed in
  // Authentication is handled via Clerk session cookies on the backend
  const loadBilling = isLoaded && isSignedIn;


  return (
    <FlowgladProvider 
      loadBilling={loadBilling}
      requestConfig={{
        // Enable credentials for auth cookies
        withCredentials: true,
      }}
    >
      {children}
    </FlowgladProvider>
  );
}

