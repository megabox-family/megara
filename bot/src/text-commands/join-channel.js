import { getBot } from '../cache-bot.js'
import {
  getIdForJoinableChannel,
  getCommandLevelForChannel,
} from '../repositories/channels.js'

export default async function (channel, { message, guild, isDirectMessage }) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const lowerCaseChannel = channel.toLowerCase()
  const joinableChannelId = await getIdForJoinableChannel(lowerCaseChannel)

  if (joinableChannelId) {
    if (
      getBot()
        .channels.cache.get(joinableChannelId)
        .permissionOverwrites.cache.filter(
          permissionOverwrite => permissionOverwrite.id === message.author.id
        ).size < 1
    ) {
      getBot()
        .channels.cache.get(joinableChannelId)
        .permissionOverwrites.create(message.author.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          message.reply(`You have been added to #${lowerCaseChannel}`)
        )
    } else message.reply(`You already have access to that channel.`)
  } else message.reply(`Sorry, ${channel} is not a joinable channel.`)
}
