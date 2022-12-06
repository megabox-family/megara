import { Client, GatewayIntentBits, Partials } from 'discord.js'
import config from '../config.js'
import {
  startup,
  handleVoiceUpdate,
  handleMessage,
  handleInteraction,
  handleReactionAdd,
  handleReactionRemove,
} from './utils/general.js'
import { handleNewMember, handleMemberUpdate } from './utils/members.js'
import {
  createChannel,
  modifyChannel,
  deleteChannel,
} from './utils/channels.js'
import { createRole, modifyRole, deleteRole } from './utils/roles.js'
import { createGuild, modifyGuild, deleteGuild } from './repositories/guilds.js'

const bot = new Client({
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
})

bot.login(config.botToken)

bot.on('ready', startup)
bot.on('guildCreate', createGuild)
bot.on('guildUpdate', modifyGuild)
bot.on('guildDelete', deleteGuild)
bot.on('guildMemberAdd', handleNewMember)
bot.on('guildMemberUpdate', handleMemberUpdate)
bot.on('channelCreate', createChannel)
bot.on('channelUpdate', modifyChannel)
bot.on('channelDelete', deleteChannel)
bot.on('roleCreate', createRole)
bot.on('roleUpdate', modifyRole)
bot.on('roleDelete', deleteRole)
bot.on('messageCreate', handleMessage)
bot.on('interactionCreate', handleInteraction)
bot.on('voiceStateUpdate', handleVoiceUpdate)
// bot.on('messageReactionAdd', handleReactionAdd)
// bot.on('messageReactionRemove', handleReactionRemove)

bot.on('rateLimit', rateLimitData => {
  console.log(rateLimitData)
})
