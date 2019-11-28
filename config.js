'use strict'

const dotenv = require('dotenv')
dotenv.config()

const e = process.env

module.exports = {
  botToken: e.DISCORD_BOT_TOKEN,
}
