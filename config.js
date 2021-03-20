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
    port: 5432,
  },
  botToken: e.DISCORD_BOT_TOKEN,
  isDevelopment,
  roles: isDevelopment
    ? { verified: '711043006253367427', 'nitro booster': null }
    : {
        verified: '644442586014023680',
        'nitro booster': '586312212612907009',
      },
  guildId: isDevelopment ? '711043006253367426' : '146109488745807873',
  logChannelId: isDevelopment ? '822941461695299624' : '822942175460720641',
}
