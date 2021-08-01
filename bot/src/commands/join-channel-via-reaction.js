import { getChannelIdFromEmoji } from '../repositories/channels.js'
import updateChannelUserCount from './update-channel-user-count.js'

export default async function (reaction, user, guild) {
  const emoji = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : `${reaction.emoji.name}`
  const channel = await getChannelIdFromEmoji(emoji)

  if (!channel || channel.messageId !== reaction.message.id) {
    reaction.users.remove(user.id)
    return
  }

  const guildChannel = guild.channels.cache.get(channel.id)

  if (
    !guildChannel
      .permissionsFor(guild.members.cache.get(user.id))
      .toArray()
      .includes('VIEW_CHANNEL')
  ) {
    guildChannel
      .updateOverwrite(user.id, { VIEW_CHANNEL: true })
      .then(() => user.send(`You have been added to #${channel.name}!`))
  } else if (
    guildChannel
      .permissionsFor(guild.members.cache.get(user.id))
      .toArray()
      .includes('VIEW_CHANNEL')
  ) {
    guildChannel
      .updateOverwrite(user.id, { VIEW_CHANNEL: false })
      .then(() => user.send(`You have been removed from #${channel.name}!`))
  }

  setTimeout(() => {
    updateChannelUserCount(guildChannel, reaction.message)
    reaction.users.remove(user.id)
  }, 2000)
}
