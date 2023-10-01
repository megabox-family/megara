import { Client, GatewayIntentBits, Partials } from 'discord.js'
import config from '../config.js'
import {
  handleGuildCreate,
  handleGuildDelete,
  handleGuildUpdate,
} from './handlers/guilds.js'
import {
  handleChannelCreate,
  handleChannelDelete,
  handleChannelUpdate,
} from './handlers/channels.js'
import { handleRoleCreate, handleRoleUpdate } from './handlers/roles.js'
import { handleMemberUpdate } from './handlers/members.js'
import {
  handleInteractionCreate,
  handleMessageCreate,
  handleVoiceStatusUpdate,
  handleReady,
} from './handlers/general.js'

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

bot.on('ready', handleReady)
bot.on('guildCreate', handleGuildCreate)
bot.on('guildUpdate', handleGuildUpdate)
bot.on('guildDelete', handleGuildDelete)
bot.on('channelCreate', handleChannelCreate)
bot.on('channelUpdate', handleChannelUpdate)
bot.on('channelDelete', handleChannelDelete)
bot.on('roleCreate', handleRoleCreate)
bot.on('roleUpdate', handleRoleUpdate)
bot.on('guildMemberUpdate', handleMemberUpdate)
bot.on('messageCreate', handleMessageCreate)
bot.on('interactionCreate', handleInteractionCreate)
bot.on('voiceStateUpdate', handleVoiceStatusUpdate)

bot.on('rateLimit', rateLimitData => {
  console.log(rateLimitData)
})

process.on('uncaughtException', function (exception) {
  console.log(exception)
})

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason)
})
