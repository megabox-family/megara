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
      !guild.channels.cache
        .get(joinableChannelId)
        .permissionsFor(guild.members.cache.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      guild.channels.cache
        .get(joinableChannelId)
        .updateOverwrite(message.author.id, { VIEW_CHANNEL: true })
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
