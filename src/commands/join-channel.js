const { getIdForJoinableChannel } = require('../repositories/channels')
const { formatReply } = require('../utils')

module.exports = async (channel, { message, guild, isDirectMessage }) => {
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
