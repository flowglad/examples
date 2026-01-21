'use client'

import { FlowgladProvider } from '@flowglad/nextjs'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
    },
  })

let clientQueryClientSingleton: QueryClient | undefined = undefined
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient())
}

export function ReactQueryProvider(props: {
  children: React.ReactNode
}) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  )
}

export function FlowgladProviderWrapper(props: {
  children: React.ReactNode
}) {
  // Use BetterAuth's useSession to watch for session changes reactively
  const { data: session } = authClient.useSession()

  // Load billing when user is logged in
  // Supports both user-based (default) and organization-based billing
  const loadBilling = !!session?.user

  return (
    <FlowgladProvider
      loadBilling={loadBilling}
      betterAuthBasePath="/api/auth"
    >
      {props.children}
    </FlowgladProvider>
  )
}
