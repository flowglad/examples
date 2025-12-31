import { FlowgladServer } from '@flowglad/server'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'

// Helper to get session from request headers
export async function getSessionFromRequest() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })
  return session
}

// Factory function that creates a FlowgladServer for a specific customer
// Pass the request so getCustomerDetails can access the session
export const flowglad = (customerExternalId: string) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async () => {
      // If request is provided, get session from it

      const session = await auth.api.getSession({
        headers: getRequestHeaders(),
      })

      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      return {
        email: session.user.email || '',
        name: session.user.name || '',
      }
    },
  })
}
