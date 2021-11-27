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
        ).size < 1
    ) {
      getBot()
        .channels.cache.get(joinableChannelId)
        .permissionOverwrites.create(message.author.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          message.reply(
            formatReply(
              `you have been added to #${lowerCaseChannel}`,
              isDirectMessage
            )
          )
        )
    } else
      message.reply(
        formatReply(`you already have access to that channel.`, isDirectMessage)
      )
  } else
    message.reply(
      formatReply(
        `sorry, ${channel} is not a joinable channel.`,
        isDirectMessage
      )
    )
}
