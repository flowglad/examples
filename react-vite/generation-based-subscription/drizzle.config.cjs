require('dotenv').config();
console.log('process.env.DATABASE_URL', process.env.DATABASE_URL);
module.exports = {
  out: './drizzle',
  schema: './server/db/schema.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};


