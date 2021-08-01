import {
  setChannelsAsAnnounced,
  getCommandLevelForChannel,
} from '../repositories/channels.js'
import { formatReply } from '../utils.js'

export default async function (args, { message, isDirectMessage }) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel !== 'admin') return

  const skippedChannels = await setChannelsAsAnnounced()
  if (skippedChannels.length)
    message.reply(formatReply(`okay, skipped!`, isDirectMessage))
}
