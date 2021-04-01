const { generateNewChannelAnnouncement } = require('../utils')
const {
  getChannelsForAnnouncement,
  getIdForChannel,
  setChannelsAsAnnounced,
  getCommandLevelForChannel,
} = require('../repositories/channels')

module.exports = async (args, { message, guild }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel !== 'admin') return

  const channelsToAnnounce = await getChannelsForAnnouncement()
  if (channelsToAnnounce.length) {
    const announcementsChannelId = await getIdForChannel('announcements')
    guild.channels.cache
      .get(announcementsChannelId)
      .send(generateNewChannelAnnouncement(channelsToAnnounce, guild))
    setChannelsAsAnnounced()
  }
}
