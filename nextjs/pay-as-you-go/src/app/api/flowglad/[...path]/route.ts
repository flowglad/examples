import { nextRouteHandler } from '@flowglad/nextjs/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { flowglad } from '@/lib/flowglad'

export const { GET, POST } = nextRouteHandler({
  flowglad,
  getCustomerExternalId: async (req) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    const userId = session?.user?.id
    if (!userId) {
      throw new Error('User not found')
    }
    return userId
  },
})
