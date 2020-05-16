const { isDevelopment } = require('../config')

const userIsInTestChannel = (message) => {
  const botChannelId = isDevelopment
    ? '711043006781849689'
    : '644365041684185099'
  return message.channel.id === botChannelId
}

const getChannelIds = (message) => {
  return message.guild.channels.map((value, key) => `${value.name}: '${key}'`).join('\n')
}

const getRoleIds = (message) => {
  return message.guild.roles.map((value, key) => `${value.name}: '${key}'`).join('\n')
}

module.exports = {
  userIsInTestChannel,
  getChannelIds,
  getRoleIds
}
