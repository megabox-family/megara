'use strict'

const dotenv = require('dotenv')
dotenv.config()

const e = process.env

const isDevelopment = e.NODE_ENV === 'development'

module.exports = {
  pg: {
    host: e.POSTGRES_HOST,
    user: e.POSTGRES_USER,
    database: e.POSTGRES_DB,
    password: e.POSTGRES_PASSWORD,
  },
  botToken: e.DISCORD_BOT_TOKEN,
  clientId: e.CLIENT_ID,
  clientSecret: e.CLIENT_SECRET,
  cookieOptions: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
  sessionSecret: e.SESSION_SECRET,
  isDevelopment,
  port: 3002,
  appUrl: isDevelopment ? 'http://localhost:3000' : 'http://megabox.family',
}
