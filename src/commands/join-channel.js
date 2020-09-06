const { getIdForJoinableChannel } = require('../repositories/channels')

module.exports = async (channel, { message, guild }) => {
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
          message.reply(`you have been added to #${lowerCaseChannel}`)
        )
    } else message.reply(`you already have access to that channel.`)
  } else message.reply(`sorry, ${channel} is not a joinable channel.`)
}
