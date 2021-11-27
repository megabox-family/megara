import { Client, Intents, MessageActionRow, MessageButton } from 'discord.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import config from '../config.js'
import {
  logMessageToChannel,
  removeVoiceChannelIfEmpty,
  checkType,
  announceNewChannel,
  getCommandLevel,
} from './utils.js'
import { syncGuilds } from './repositories/guilds.js'
import {
  channelWithVoiceChannelIsJoinable,
  getActiveVoiceChannelIds,
  createChannel,
  deleteChannel,
  modifyChannel,
  syncChannels,
} from './repositories/channels.js'
import { cacheBot, getBot } from './repositories/cache-bot.js'

// Text commands
import name from './text-commands/change-nickname.js'
import join from './text-commands/join-channel.js'
import leave from './text-commands/leave-channel.js'
import roll from './text-commands/dice-roller.js'
import color from './text-commands/set-color.js'
import ids from './text-commands/get-ids.js'
import channel from './text-commands/get-channel-info.js'
import sync from './text-commands/sync-missing-data.js'
import help from './text-commands/help.js'
import coords from './text-commands/minecraft-coordinates.js'
import voice from './text-commands/voice.js'
import test from './text-commands/test.js'

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
  coords,
  voice,
  test,
}

// Reaction commands
const reactionCommands = {}

// Button commands
import joinChannel from './button-commands/join-channel.js'
import leaveChannel from './button-commands/leave-channel.js'

const buttonCommands = { joinChannel, leaveChannel }

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

  const activeVoiceChannels = await getActiveVoiceChannelIds()

  activeVoiceChannels.forEach(channel => {
    setTimeout(async () => {
      const voiceChannel = await bot.channels.cache.get(
        channel.activeVoiceChannelId
      )
      removeVoiceChannelIfEmpty(voiceChannel)
    }, 30000)
  })
})

bot.on('messageCreate', message => {
  if (!message.guild || getCommandLevel(message.channel) === 'prohibited')
    return

  const messageText = message.content

  if (messageText.substring(0, 1) === '!') {
    const command = messageText.includes(' ')
      ? messageText.substring(1, messageText.indexOf(' '))
      : messageText.substring(1)
    const args = messageText.substring(messageText.indexOf(' ') + 1)

    if (textCommands[command.toLowerCase()]) {
      textCommands[command.toLowerCase()](args, message)
    }
  }
})

bot.on('guildMemberAdd', member => {
  const tosButtonRow = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!acceptTos: ${member.guild.id}`)
      .setLabel(`Accept`)
      .setStyle('SUCCESS'),
    new MessageButton()
      .setCustomId(`!denyTos: ${member.guild.id}`)
      .setLabel(`Deny`)
      .setStyle('DANGER')
  )

  member.send({
    content: fs.readFileSync(
      dirname(fileURLToPath(import.meta.url)) + '/media/welcome-message.txt',
      'utf8'
    ),
    components: [tosButtonRow],
  })

  // const welcomeMessage = fs.readFileSync(
  //   __dirname + '/media/welcome-message.txt',
  //   'utf8'
  // )

  // member.send(welcomeMessage)
})

// bot.on('messageReactionAdd', async (reaction, user) => {
// if (reaction.partial) {
//   try {
//     await reaction.fetch()
//   } catch (error) {
//     console.log('Something went wrong fetch, the message: ', error)
//   }
// }
// })

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
  modifyChannel(oldChannel, newChannel)
})

bot.on('interactionCreate', interaction => {
  if (interaction.isButton())
    buttonCommands[interaction.customId.match(`(?!!).+(?=:)`)[0]](interaction)
})
