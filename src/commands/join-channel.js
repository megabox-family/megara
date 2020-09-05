const { getIdForJoinableChannel } = require('../repositories/channels')

module.exports = async (channel, message) => {
  const lowerCaseChannel = channel.toLowerCase()
  const joinableChannelId = await getIdForJoinableChannel(lowerCaseChannel)

  // Is it faster to put the rest of this in a .then() rather than awaiting the function call above?
  // Or rather, does awaiting here block other commands from being handled until this resolves?
  if (joinableChannelId) {
    if (
      !message.guild.channels.cache
        .get(joinableChannelId)
        .permissionsFor(message.guild.members.cache.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      message.guild.channels.cache
        .get(joinableChannelId)
        .updateOverwrite(message.author.id, { VIEW_CHANNEL: true })
        .then(() =>
          message.reply(`you have been added to #${lowerCaseChannel}`)
        )
    } else message.reply(`you already have access to that channel.`)
  } else message.reply(`sorry, ${channel} is not a joinable channel.`)
}
