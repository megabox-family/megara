const { isDevelopment } = require('../config')

const userIsInTestChannel = message => {
  const botChannelId = isDevelopment
    ? '711043006781849689'
    : '644365041684185099'
  return message.channel.id === botChannelId
}

const getChannelIdsWithNames = message => {
  return message.guild.channels.cache
    .map((value, key) => `${value.name}: '${key}'`)
    .join('\n')
}

const getRoleIdsWithNames = message => {
  return message.guild.roles.cache
    .map((value, key) => `${value.name}: '${key}'`)
    .join('\n')
}

const formatReply = (replyMessage, isDirectMessage = false) => {
  return isDirectMessage
    ? replyMessage.charAt(0).toUpperCase() + replyMessage.substring(1)
    : replyMessage
}

module.exports = {
  userIsInTestChannel,
  getChannelIdsWithNames,
  getRoleIdsWithNames,
  formatReply,
}
