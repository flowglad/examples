import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const isAuthRoute = request.url.includes('/sign-in') || request.url.includes('/sign-up')

    if (session && isAuthRoute) {
      throw redirect({ to: '/' })
    } else if (!session && !isAuthRoute) {
      throw redirect({ to: '/sign-in' })
    }

    return await next()
  },
)
