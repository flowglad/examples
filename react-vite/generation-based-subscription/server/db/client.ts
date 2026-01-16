import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Cache pool in global to avoid exhausting connections in dev
const pool =
  (global as any).__db_pool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  (global as any).__db_pool__ = pool;
}

export const db = drizzle(pool, { schema });