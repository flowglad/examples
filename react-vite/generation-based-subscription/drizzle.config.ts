import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Prefer .env.local for local development (consistent with other examples)
dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for drizzle-kit.')
}
export default defineConfig({
  out: './drizzle',
  schema: './server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
})
