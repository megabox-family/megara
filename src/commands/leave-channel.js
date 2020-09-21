const {
  getIdForJoinableChannel,
  getCommandLevelForChannel,
} = require('../repositories/channels')
const { formatReply } = require('../utils')

module.exports = async (channel, { message, guild, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const lowerCaseChannel = channel.toLowerCase()
  const joinableChannelId = await getIdForJoinableChannel(lowerCaseChannel)

  if (joinableChannelId) {
    if (
      guild.channels.cache
        .get(joinableChannelId)
        .permissionsFor(guild.members.cache.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      guild.channels.cache
        .get(joinableChannelId)
        .updateOverwrite(message.author.id, { VIEW_CHANNEL: false })
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
