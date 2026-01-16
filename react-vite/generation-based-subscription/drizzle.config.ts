import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Prefer .env.local for local development (consistent with other examples)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  out: './drizzle',
  schema: './server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
