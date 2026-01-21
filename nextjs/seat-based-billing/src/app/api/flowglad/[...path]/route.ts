import { nextRouteHandler } from '@flowglad/nextjs/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { flowglad } from '@/lib/flowglad'

export const { GET, POST } = nextRouteHandler({
  flowglad,
  getCustomerExternalId: async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    // Use organization ID if user has an active organization (for team billing)
    // Otherwise default to user ID (for individual billing)
    const orgId = session?.session?.activeOrganizationId
    if (orgId) {
      return orgId
    }

    // Default to user-based billing
    const userId = session?.user?.id
    if (!userId) {
      throw new Error('User not found')
    }
    return userId
  },
})
