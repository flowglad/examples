import { createFileRoute } from '@tanstack/react-router'
import { requestHandler } from '@flowglad/server'
import { flowglad, getSessionFromRequest } from '../../../lib/flowglad'
import type { HTTPMethod } from '@flowglad/shared'

// Handle Flowglad API requests
async function handleFlowgladRequest(request: Request): Promise<Response> {
  // Auth check
  const session = await getSessionFromRequest(request)
  if (!session?.user) {
    return Response.json({ error: 'User not authenticated' }, { status: 401 })
  }

  // Create the handler with the request in closure so getCustomerDetails can access it
  const flowgladHandler = requestHandler({
    flowglad: (customerExternalId: string) =>
      flowglad(customerExternalId, request),
    getCustomerExternalId: async () => session.user.id,
  })

  const url = new URL(request.url)
  const path = url.pathname
    .replace('/api/flowglad/', '')
    .split('/')
    .filter((segment) => segment !== '')

  try {
    const result = await flowgladHandler(
      {
        path,
        method: request.method as HTTPMethod,
        query:
          request.method === 'GET'
            ? Object.fromEntries(url.searchParams)
            : undefined,
        body:
          request.method !== 'GET'
            ? await request.json().catch(() => ({}))
            : undefined,
      },
      request,
    )

    return Response.json(
      {
        error: result.error,
        data: result.data,
      },
      {
        status: result.status,
      },
    )
  } catch (error) {
    console.error('Flowglad API error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

export const Route = createFileRoute('/api/flowglad/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return handleFlowgladRequest(request)
      },
      POST: async ({ request }) => {
        return handleFlowgladRequest(request)
      },
    },
  },
})
