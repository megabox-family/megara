const { isDevelopment, logChannelId } = require('../config')

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

const generateNewChannelAnnouncement = (newChannels, guild) => {
  if (newChannels.length >= 5) {
    const newChannelIds = newChannels.map(x => x.id)
    return `@everyone \nWe've got a bunch of new channels! Here they are:
    \n${newChannelIds
      .map(id => `- ${guild.channels.cache.get(id).toString()}`)
      .join('\n')}
    \nJoin 'em with the\`!join\` command. (ex: \`!join ${
      newChannels[0].name
    }\`)`
  } else if (newChannels.length > 1 && newChannels.length < 5) {
    const newChannelIds = newChannels.map(x => x.id)
    return `@everyone \nAnnouncement! We have a few more channels you can join! ${newChannelIds
      .map((id, i, originalIds) => {
        if (i + 1 === originalIds.length)
          return `and ${guild.channels.cache.get(id).toString()}`
        else return guild.channels.cache.get(id).toString()
      })
      .join(', ')}
      \nJoin any of them with the \`!join\` command. (ex: \`!join ${
        newChannels[0].name
      }\`)`
  } else {
    const newChannelId = newChannels[0].id

    return `@everyone \nHey guys, we added a new channel, ${guild.channels.cache
      .get(newChannelId)
      .toString()}! Join it with the \`!join\` command. (ex: \`!join ${
      newChannels[0].name
    }\`)`
  }
}

const logMessageToChannel = ({ message, guild }, botId) => {
  const currentDateTime = new Date()
  const recipient = message.channel.recipient.tag
  const messagePrefix =
    message.author.id === botId
      ? `**I sent the following message to ${recipient} at ${currentDateTime.toISOString()}:**\n`
      : `**${
          message.author.tag
        } sent the following message at ${currentDateTime.toISOString()}:**\n`
  guild.channels.cache.get(logChannelId).send(messagePrefix + message.content)
}

const sortChannelsIntoCategories = channels => {
  let categorizedChannelsDictionary = {}

  channels.forEach(channel => {
    if (categorizedChannelsDictionary[channel.categoryName])
      categorizedChannelsDictionary[channel.categoryName].push(channel)
    else categorizedChannelsDictionary[channel.categoryName] = [channel]
  })

  return categorizedChannelsDictionary
}

module.exports = {
  userIsInTestChannel,
  getChannelIdsWithNames,
  generateNewChannelAnnouncement,
  getRoleIdsWithNames,
  formatReply,
  logMessageToChannel,
  sortChannelsIntoCategories,
}
