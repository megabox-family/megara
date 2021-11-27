import { getBot } from '../repositories/cache-bot.js'
import {
  getIdForJoinableChannel,
  getCommandLevelForChannel,
} from '../repositories/channels.js'
import { formatReply } from '../utils.js'

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
          message.reply(
            formatReply(
              `you have been removed from #${lowerCaseChannel}`,
              isDirectMessage
            )
          )
        )
    } else
      message.reply(
        formatReply(`you are not a part of that channel.`, isDirectMessage)
      )
  } else
    message.reply(
      formatReply(`sorry, ${channel} is not a valid channel.`, isDirectMessage)
    )
}
