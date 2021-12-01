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
        ).size > 0
    ) {
      getBot()
        .channels.cache.get(joinableChannelId)
        .permissionOverwrites.delete(message.author.id)
        .then(() =>
          message.reply(`You have been removed from #${lowerCaseChannel}`)
        )
    } else message.reply(`You are not a part of that channel.`)
  } else message.reply(`Sorry, ${channel} is not a valid channel.`)
}
