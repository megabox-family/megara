const { joinableChannels } = require('../../config')

const isChannelValid = channel => {
  return joinableChannels.hasOwnProperty(channel.toLowerCase())
}

module.exports = (channel, message) => {
  if (isChannelValid(channel)) {
    if (
      !message.guild.channels
        .get(joinableChannels[channel])
        .permissionsFor(message.guild.members.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      message.guild.channels
        .get(joinableChannels[channel])
        .overwritePermissions(message.author.id, { VIEW_CHANNEL: true })
        .then(() => message.reply(`you have been added to #${channel}`))
    } else message.reply(`you already have access to that channel.`)
  } else message.reply(`sorry, ${channel} is not a joinable channel.`)
}
