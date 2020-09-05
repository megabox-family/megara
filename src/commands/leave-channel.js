const { getIdForJoinableChannel } = require('../repositories/channels')

module.exports = async (channel, message) => {
  const lowerCaseChannel = channel.toLowerCase()
  const joinableChannelId = await getIdForJoinableChannel(lowerCaseChannel)

  if (joinableChannelId) {
    if (
      message.guild.channels.cache
        .get(joinableChannelId)
        .permissionsFor(message.guild.members.cache.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      message.guild.channels.cache
        .get(joinableChannelId)
        .updateOverwrite(message.author.id, { VIEW_CHANNEL: false })
        .then(() =>
          message.reply(`you have been removed from #${lowerCaseChannel}`)
        )
    } else message.reply(`you are not a part of that channel.`)
  } else message.reply(`sorry, ${channel} is not a valid channel.`)
}
