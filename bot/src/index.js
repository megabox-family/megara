import { Client, Intents } from 'discord.js'
import config from '../config.js'
import {
  startup,
  checkVoiceChannelValidity,
  handleMessage,
  handleNewMember,
  modifyMember,
  handleInteraction,
} from './utils/general.js'
import {
  createChannel,
  modifyChannel,
  deleteChannel,
} from './utils/channels.js'
import { createRole, modifyRole, deleteRole } from './utils/roles.js'
import { createGuild, modifyGuild, deleteGuild } from './repositories/guilds.js'

const bot = new Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
})

bot.login(config.botToken)

bot.on('ready', startup)
bot.on('guildCreate', createGuild)
bot.on('guildCreate', modifyGuild)
bot.on('guildDelete', deleteGuild)
bot.on('guildMemberAdd', handleNewMember)
bot.on('guildMemberUpdate', modifyMember)
bot.on('channelCreate', createChannel)
bot.on('channelUpdate', modifyChannel)
bot.on('channelDelete', deleteChannel)
bot.on('roleCreate', createRole)
bot.on('roleUpdate', modifyRole)
bot.on('roleDelete', deleteRole)
bot.on('messageCreate', handleMessage)
bot.on('interactionCreate', handleInteraction)
bot.on('voiceStateUpdate', checkVoiceChannelValidity)

bot.on('rateLimit', rateLimitData => {
  console.log(rateLimitData)
})
