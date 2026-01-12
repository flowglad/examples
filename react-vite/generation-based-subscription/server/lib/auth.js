// Load environment variables first
require('dotenv').config();

const { betterAuth } = require('better-auth');
const { drizzleAdapter } = require('better-auth/adapters/drizzle');
const { flowgladPlugin } = require('@flowglad/server/better-auth');
const { db } = require('../db/client');
const { betterAuthSchema } = require('../db/schema');

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
  // Flowglad plugin for customer management
  plugins: [
    flowgladPlugin({
      customerType: 'user',
    }),
  ],
});

module.exports = { auth };

