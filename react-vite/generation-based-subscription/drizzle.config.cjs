require('dotenv').config();

module.exports = {
  out: './drizzle',
  schema: './server/db/schema.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};


