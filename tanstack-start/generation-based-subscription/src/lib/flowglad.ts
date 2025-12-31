import { FlowgladServer } from '@flowglad/server'
import { auth } from './auth'

// Helper to get session from request headers
export async function getSessionFromRequest(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  return session
}

// Factory function that creates a FlowgladServer for a specific customer
// Pass the request so getCustomerDetails can access the session
export const flowglad = (customerExternalId: string, request?: Request) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async () => {
      // If request is provided, get session from it
      if (request) {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session?.user) {
          throw new Error('User not authenticated')
        }

        return {
          email: session.user.email || '',
          name: session.user.name || '',
        }
      }

      // Fallback: return empty details (Flowglad will use existing customer data)
      return {
        email: '',
        name: '',
      }
    },
  })
}
