const {
  setChannelsAsAnnounced,
  getCommandLevelForChannel,
} = require('../repositories/channels')
const { formatReply } = require('../utils')

module.exports = async (args, { message, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel !== 'admin') return

  const skippedChannels = await setChannelsAsAnnounced()
  if (skippedChannels.length)
    message.reply(formatReply(`okay, skipped!`, isDirectMessage))
}
