// Load environment variables first
import dotenv from 'dotenv';
// Prefer .env.local for local development (consistent with other examples)
dotenv.config({ path: '.env.local' });

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.js';
import { betterAuthSchema } from '../db/schema.js';

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
if (!betterAuthSecret) {
  throw new Error('BETTER_AUTH_SECRET is not set');
}

const auth = betterAuth({
  // Providers & cookies integration
  secret: betterAuthSecret,
  baseURL: process.env.VITE_APP_URL || 'http://localhost:5173',
  basePath: '/api/auth',
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
  // Trust proxy for proper cookie handling behind reverse proxy
  trustedOrigins: [process.env.VITE_APP_URL || 'http://localhost:5173'],
});

export { auth };

