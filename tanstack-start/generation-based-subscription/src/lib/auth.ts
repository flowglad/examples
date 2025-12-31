import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'
import { betterAuthSchema } from '../db/schema'

const betterAuthSecret = process.env.BETTER_AUTH_SECRET
if (!betterAuthSecret) {
  throw new Error('BETTER_AUTH_SECRET is not set')
}

export const auth = betterAuth({
  // Providers & cookies integration
  secret: betterAuthSecret,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  // Database via Drizzle adapter with explicit schema mapping
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: betterAuthSchema,
  }),
})

export type Session = typeof auth.$Infer.Session
