import Discord from 'discord.js'
import fs from 'fs'
import config from '../config.js'
import {
  logMessageToChannel,
  removeVoiceChannelIfEmpty,
  checkType,
} from './utils.js'
import {
  getJoinableChannelsMessageIds,
  channelWithVoiceChannelIsJoinable,
  getActiveVoiceChannelIds,
  createChannel,
  deleteChannel,
  modifyChannel,
  syncChannels,
} from './repositories/channels.js'

// Text commands
import name from './commands/change-nickname.js'
import join from './commands/join-channel.js'
import leave from './commands/leave-channel.js'
import roll from './commands/dice-roller.js'
import color from './commands/set-color.js'
import ids from './commands/get-ids.js'
import channel from './commands/get-channel-info.js'
import sync from './commands/sync-missing-data.js'
import help from './commands/help.js'
import announce from './commands/announce-new-channels.js'
import skip from './commands/skip-channel-announcement.js'
import coords from './commands/minecraft-coordinates.js'
import generate from './commands/generate-channels-message.js'
import voice from './commands/voice.js'

const textCommands = {
  name,
  join,
  leave,
  roll,
  color,
  ids,
  channel,
  sync,
  help,
  announce,
  skip,
  coords,
  generate,
  voice,
}

// Reaction commands
import joinReaction from './commands/join-channel-via-reaction.js'

const reactionCommands = {
  joinReaction,
}

const bot = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })

bot.login(config.botToken)

bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}!`)

  // console.log(bot.channels.cache.get("871119874083160064").type);

  syncChannels(
    bot.channels.cache,
    bot.guilds.cache.get(config.guildId).roles.cache
  )

  bot.channels.cache.forEach(channel => {
    console.log(channel.name)
  })

  const activeVoiceChannels = await getActiveVoiceChannelIds()

  activeVoiceChannels.forEach(channel => {
    setTimeout(async () => {
      const voiceChannel = await bot.guilds.cache
        .get(config.guildId)
        .channels.cache.get(channel.activeVoiceChannelId)
      removeVoiceChannelIfEmpty(voiceChannel)
    }, 30000)
  })
})

bot.on('message', message => {
  const messageText = message.content
  const context = {
    guild: bot.guilds.cache.get(config.guildId),
    message,
    isDirectMessage: !message.guild,
  }

  if (!context.isDirectMessage && message.guild.id !== config.guildId) return

  if (context.isDirectMessage) logMessageToChannel(context, bot.user.id)

  if (messageText.substring(0, 1) === '!') {
    const command = messageText.includes(' ')
      ? messageText.substring(1, messageText.indexOf(' '))
      : messageText.substring(1)
    const args = messageText.substring(messageText.indexOf(' ') + 1)

    if (textCommands[command.toLowerCase()]) {
      textCommands[command.toLowerCase()](args, context)
    }
  }
})

bot.on('guildMemberAdd', member => {
  if (member.guild.id !== config.guildId) return

  const welcomeMessage = fs.readFileSync(
    __dirname + '/media/welcome-message.txt',
    'utf8'
  )

  member.send(welcomeMessage)
})

bot.on('messageReactionAdd', async (reaction, user) => {
  if (!reaction.message.guild || reaction.message.guild.id !== config.guildId)
    return

  const joinableChannelsMessageIds = await getJoinableChannelsMessageIds()

  if (
    !joinableChannelsMessageIds.includes(reaction.message.id) ||
    user.id === bot.user.id
  )
    return
  if (reaction.partial) {
    try {
      await reaction.fetch()
    } catch (error) {
      console.log('Something went wrong fetch, the message: ', error)
    }
  }
  reactionCommands.joinReaction(
    reaction,
    user,
    bot.guilds.cache.get(config.guildId)
  )
})

bot.on('voiceStateUpdate', async oldState => {
  if (
    oldState.channel &&
    (await channelWithVoiceChannelIsJoinable(oldState.channelID)) &&
    oldState.channel.members.size === 0
  ) {
    setTimeout(async () => {
      if (!oldState.channel) return
      const voiceChannel = await oldState.channel.guild.channels.cache.get(
        oldState.channelID
      )
      removeVoiceChannelIfEmpty(voiceChannel)
    }, 30000)
  }
})

bot.on('channelCreate', async channel => {
  createChannel(channel)
})

bot.on('channelDelete', async channel => {
  deleteChannel(channel.id)
})

bot.on('channelUpdate', (oldChannel, newChannel) => {
  const roles = bot.guilds.cache.get(config.guildId).roles.cache,
    oldTextType = checkType(oldChannel, roles),
    newTextType = checkType(newChannel, roles)

  if (
    oldChannel.name !== newChannel.name ||
    oldChannel.parentID !== newChannel.parentID ||
    oldTextType !== newTextType
  ) {
    const isPendingAnnouncement =
      oldTextType !== newTextType && newType === `joinable` ? true : false

    modifyChannel(newChannel, newTextType, isPendingAnnouncement)
  }
})
