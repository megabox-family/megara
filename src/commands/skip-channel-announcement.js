const { setChannelsAsAnnounced } = require('../repositories/channels')
const { formatReply } = require('../utils')

module.exports = async (args, { message, isDirectMessage }) => {
  // Should only be usable from the admin channel
  const skippedChannels = await setChannelsAsAnnounced()
  if (skippedChannels.length)
    message.reply(formatReply(`okay, skipped!`, isDirectMessage))
}
