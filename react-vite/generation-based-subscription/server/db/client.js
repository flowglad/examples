// Load environment variables first
require('dotenv').config();

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('./schema');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Cache pool in global to avoid exhausting connections in dev
const pool =
  global.__db_pool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__db_pool__ = pool;
}

const db = drizzle(pool, { schema });

module.exports = { db };


