import { FlowgladServer } from '@flowglad/nextjs/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const flowglad = (customerExternalId: string) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
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
