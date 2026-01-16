import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // uses the Vite dev server url because vite proxies the api requests to the server
  baseURL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
});


