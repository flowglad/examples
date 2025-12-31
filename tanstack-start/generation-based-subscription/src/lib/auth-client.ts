import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // Default to relative origin; allows prod/staging to work without hard-coded localhost
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
})
