import config from '../config.js'
import { removeActiveVoiceChannelId } from './repositories/channels.js'

export function userIsInTestChannel(message) {
  const botChannelId = config.isDevelopment
    ? '711043006781849689'
    : '644365041684185099'
  return message.channel.id === botChannelId
}

export function getChannelIdsWithNames(message) {
  return message.guild.channels.cache
    .map((value, key) => `${value.name}: '${key}'`)
    .join('\n')
}

export function getRoleIdsWithNames(message) {
  return message.guild.roles.cache
    .map((value, key) => `${value.name}: '${key}'`)
    .join('\n')
}

export function formatReply(replyMessage, isDirectMessage = false) {
  return isDirectMessage
    ? replyMessage.charAt(0).toUpperCase() + replyMessage.substring(1)
    : replyMessage
}

export function generateNewChannelAnnouncement(newChannels, guild) {
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

export async function logMessageToChannel({ message, guild }, botId) {
  const currentDateTime = new Date()
  const recipientId =
    message.author.id === botId
      ? message.channel.recipient.id
      : message.author.id

  const guildMember = guild.members.cache.get(recipientId)

  if (guildMember.partial) {
    try {
      await guild.members.fetch()
    } catch (err) {
      console.log('Error fetching users: ', err)
    }
  }

  const userDisplayName =
    message.author.id === botId
      ? guildMember.nickname
        ? guildMember.nickname + ` (${message.channel.recipient.tag})`
        : message.channel.recipient.tag
      : guildMember.nickname
      ? guildMember.nickname + ` (${message.author.tag})`
      : message.author.tag

  const messagePrefix =
    message.author.id === botId
      ? `**I sent the following message to ${userDisplayName} at ${currentDateTime.toISOString()}:**\n`
      : `**${userDisplayName} sent the following message at ${currentDateTime.toISOString()}:**\n`
  guild.channels.cache
    .get(config.logChannelId)
    .send(messagePrefix + message.content)
}

export function logErrorMessageToChannel(errorMessage, guild) {
  guild.channels.cache.get(config.logChannelId).send(`Error: ${errorMessage}`)
}

export function sortChannelsIntoCategories(channels) {
  let categorizedChannels = new Map()

  categorizedChannels.set('General', [])

  channels.forEach(channel => {
    if (categorizedChannels.get(channel.categoryName))
      categorizedChannels.get(channel.categoryName).push(channel)
    else categorizedChannels.set(channel.categoryName, [channel])
  })

  for (const [category, categoryChannels] of categorizedChannels) {
    let prioritizedChannel = categoryChannels.find((channel, i) => {
      if (channel.hasPriority) {
        categoryChannels.splice(i, 1)
        return true
      } else return false
    })
    categorizedChannels.set(category, [prioritizedChannel, ...categoryChannels])
  }

  return categorizedChannels
}

export function removeVoiceChannelIfEmpty(voiceChannel) {
  const currentMembers = voiceChannel?.members.size

  if (!currentMembers)
    voiceChannel.delete().then(() => {
      removeActiveVoiceChannelId(voiceChannel.id)
    })
}

export function checkType(channel, roles) {
  const permissions = channel.permissionOverwrites.map(
    role => roles.get(role.id)?.name
  )

  console.log(permissions)

  if (permissions.includes(`joinable`)) {
    return `joinable`
  } else if (permissions.includes(`public`)) {
    return `public`
  } else {
    return `private`
  }
}
