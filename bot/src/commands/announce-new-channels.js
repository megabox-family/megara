import { generateNewChannelAnnouncement } from '../utils.js'
import {
  getChannelsForAnnouncement,
  getIdForChannel,
  setChannelsAsAnnounced,
  getCommandLevelForChannel,
} from '../repositories/channels.js'

export default async function (args, { message, guild }) {
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
