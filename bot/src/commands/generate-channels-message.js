const { getAdminRoleIds } = require('../repositories/roles')
const {
  getJoinableChannelsWithEmoji,
  updateChannelMessageId,
} = require('../repositories/channels')
const { sortChannelsIntoCategories } = require('../utils')

module.exports = async (command, { message, guild }) => {
  const lowerCaseCommand = command.toLowerCase()
  const adminRoleIds = await getAdminRoleIds()

  const isAdmin = guild.members.cache
    .get(message.author.id)
    .roles.cache.some(x => adminRoleIds.includes(x.id))

  if (!isAdmin || lowerCaseCommand !== 'channels') return

  const channels = await getJoinableChannelsWithEmoji()
  const sortedChannels = sortChannelsIntoCategories(channels)

  for (const [category, categoryChannels] of sortedChannels) {
    let messageContent =
      category === 'General'
        ? `**${category}** - (**#** = members in channel)`
        : `**${category}**`

    categoryChannels.forEach(channel => {
      messageContent += `\n${channel.emoji}  <#${channel.id}> `
    })

    message.channel.send(messageContent).then(sentMessage => {
      categoryChannels.forEach(channel => {
        updateChannelMessageId(channel.id, sentMessage.id)
        sentMessage.react(channel.emoji)
      })
    })
  }
}
