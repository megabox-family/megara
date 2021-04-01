const Discord = require('discord.js')
const bot = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
const fs = require('fs')

const config = require('../config')
const { logMessageToChannel } = require('./utils')
const { getJoinableChannelsMessageIds } = require('./repositories/channels')

const textCommands = {
  name: require('./commands/change-nickname'),
  join: require('./commands/join-channel'),
  leave: require('./commands/leave-channel'),
  roll: require('./commands/dice-roller'),
  color: require('./commands/set-color'),
  ids: require('./commands/get-ids'),
  channel: require('./commands/get-channel-info'),
  sync: require('./commands/sync-missing-data'),
  help: require('./commands/help'),
  announce: require('./commands/announce-new-channels'),
  skip: require('./commands/skip-channel-announcement'),
  coords: require('./commands/minecraft-coordinates'),
  generate: require('./commands/generate-channels-message'),
}

const reactionCommands = {
  join: require('./commands/join-channel-via-reaction'),
}

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`)
})

bot.on('message', message => {
  const messageText = message.content
  const context = {
    guild: bot.guilds.cache.get(config.guildId),
    message,
    isDirectMessage: !message.guild,
  }

  if (!context.isDirectMessage && message.guild.id !== config.guildId) return

  if (context.isDirectMessage) logMessageToChannel(context)

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
      console.log('Something went wrong when fetching the message: ', error)
    }
  }
  reactionCommands.join(reaction, user, bot.guilds.cache.get(config.guildId))
})

bot.login(config.botToken)
