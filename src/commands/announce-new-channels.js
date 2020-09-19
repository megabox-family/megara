const { generateNewChannelAnnouncement } = require('../utils')
const {
  getChannelsForAnnouncement,
  getIdForChannel,
  setChannelsAsAnnounced,
} = require('../repositories/channels')

module.exports = async (args, { guild }) => {
  // Should only be usable from the admin channel
  const channelsToAnnounce = await getChannelsForAnnouncement()
  if (channelsToAnnounce.length) {
    const announcementsChannelId = await getIdForChannel('announcements')
    guild.channels.cache
      .get(announcementsChannelId)
      .send(generateNewChannelAnnouncement(channelsToAnnounce, guild))
    setChannelsAsAnnounced()
  }
}
