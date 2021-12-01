import { Client, Intents } from 'discord.js'
import { cacheBot } from './cache-bot.js'
import config from '../config.js'
import {
  removeEmptyVoiceChannelsOnStartup,
  checkVoiceChannelValidity,
  handleMessage,
  handleNewMember,
  handleInteraction,
} from './utils/general.js'
import { syncChannels, createChannel, modifyChannel } from './utils/channels.js'
import { syncGuilds } from './repositories/guilds.js'
import { deleteChannel } from './repositories/channels.js'

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

bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}!`)

  cacheBot(bot)
  await syncGuilds()
  await syncChannels()
  await removeEmptyVoiceChannelsOnStartup()
})

bot.on('voiceStateUpdate', checkVoiceChannelValidity)
bot.on('messageCreate', handleMessage)
bot.on('guildMemberAdd', handleNewMember)
bot.on('channelCreate', createChannel)
bot.on('channelDelete', deleteChannel)
bot.on('channelUpdate', modifyChannel)
bot.on('interactionCreate', handleInteraction)
