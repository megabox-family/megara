const { joinableChannels } = require('../utils')

const isChannelValid = channel => {
  return !!joinableChannels[channel]
}

module.exports = (channel, message) => {
  const lowerCaseChannel = channel.toLowerCase()
  if (isChannelValid(lowerCaseChannel)) {
    if (
      !message.guild.channels
        .get(joinableChannels[lowerCaseChannel])
        .permissionsFor(message.guild.members.get(message.author.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      message.guild.channels
        .get(joinableChannels[lowerCaseChannel])
        .overwritePermissions(message.author.id, { VIEW_CHANNEL: true })
        .then(() =>
          message.reply(`you have been added to #${lowerCaseChannel}`)
        )
    } else message.reply(`you already have access to that channel.`)
  } else message.reply(`sorry, ${channel} is not a joinable channel.`)
}
