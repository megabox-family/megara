import { MessageActionRow, MessageButton } from 'discord.js'
import { getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getCommandLevel } from './channels.js'
import { getAnnouncementChannel } from '../repositories/guilds.js'
import {
  removeActiveVoiceChannelId,
  getCategoryName,
  getUnrestrictedChannels,
  getActiveVoiceChannelIds,
  channelWithVoiceChannelIsJoinable,
} from '../repositories/channels.js'

const relativePath = dirname(fileURLToPath(import.meta.url)),
  srcPath = dirname(relativePath),
  textCommandFiles = readdirSync(`${srcPath}/text-commands`),
  textCommands = textCommandFiles.map(textCommandFile => {
    return {
      baseName: basename(textCommandFile, '.js').replace(/-/g, ``),
      fullPath: `${srcPath}/text-commands/${textCommandFile}`,
    }
  })

export async function logMessageToChannel(message) {
  const logChannelId = getLogChannelId(message.guild.id)

  if (!logChannelId) return

  const currentDateTime = new Date(),
    recipientId = message.channel.recipient.id,
    guildMember = getBot().members.cache.get(recipientId)

  if (guildMember.partial) {
    try {
      await getBot().members.fetch()
    } catch (err) {
      console.log('Error fetching users: ', err)
    }
  }

  const userDisplayName = guildMember.nickname
    ? guildMember.nickname + ` (${message.channel.recipient.tag})`
    : message.channel.recipient.tag

  const messagePrefix = `**I sent the following message to ${userDisplayName} at ${currentDateTime.toISOString()}:**\n`

  getBot()
    .channels.cache.get(logChannelId)
    .send(messagePrefix + message.content)
}

export function logErrorMessageToChannel(errorMessage) {
  const logChannelId = getLogChannelId(message.guild.id)

  if (!logChannelId) return

  getBot().channels.cache.get(logChannelId).send(`Error: ${errorMessage}`)
}

export function removeVoiceChannelIfEmpty(voiceChannel) {
  const currentMembers = voiceChannel?.members.size

  if (!currentMembers)
    voiceChannel.delete().then(() => {
      removeActiveVoiceChannelId(voiceChannel.id)
    })
}

export async function announceNewChannel(newChannel) {
  const announcementChannelId = await getAnnouncementChannel(
    newChannel.guild.id
  )

  if (!announcementChannelId) return

  const unrestrictedChannels = await getUnrestrictedChannels(),
    compatibleChannels = unrestrictedChannels.map(
      unrestrictedChannel => `<#${unrestrictedChannel.id}>`
    )

  const joinButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${newChannel.id}`)
        .setLabel(`Join ${newChannel.name}`)
        .setStyle('SUCCESS')
    ),
    categoryName = await getCategoryName(newChannel.parentId)
  getBot()
    .channels.cache.get(announcementChannelId)
    .send({
      content: `
        @everyone Hey guys! 😁\
        \nWe've added a new channel, <#${
          newChannel.id
        }>, in the '${categoryName}' category.\
        \nPress the button below, or use the \`!join\` command (ex: \`!join ${
          newChannel.name
        }\`) to join.\
        \nThe \`!join\` command works in these channels: ${compatibleChannels.join(
          `, `
        )}
      `,
      components: [joinButtonRow],
    })
}

export function handleMessage(message) {
  if (
    !message.guild ||
    getCommandLevel(message.channel) === 'prohibited' ||
    !textCommandFiles
  )
    return

  const messageText = message.content

  if (messageText.substring(0, 1) === '!') {
    const delimiter = messageText.split('').find(char => {
        if ([` `, `\n`].includes(char)) return char
        else return null
      }),
      command = delimiter
        ? messageText.substring(1, messageText.indexOf(delimiter)).toLowerCase()
        : messageText.substring(1).toLowerCase(),
      args = delimiter
        ? messageText.substring(messageText.indexOf(delimiter) + 1)
        : null,
      textCommand = textCommands.find(
        textCommand => textCommand.baseName === command
      )

    if (textCommand)
      import(textCommand.fullPath).then(module => module.default(message, args))
    else
      message.reply(
        `
        Sorry, \`!${command}\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
      )
  }
}

export function handleNewMember(member) {
  const tosButtonRow = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!accept-tos: ${member.guild.id}`)
      .setLabel(`Accept`)
      .setStyle('SUCCESS'),
    new MessageButton()
      .setCustomId(`!deny-tos: ${member.guild.id}`)
      .setLabel(`Deny`)
      .setStyle('DANGER')
  )

  member.send({
    content: `sup brah`,
    components: [tosButtonRow],
  })
}

export function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const buttonFunctionPath = `${srcPath}/button-commands/${
      interaction.customId.match(`(?!!).+(?=:)`)[0]
    }.js`

    if (existsSync(buttonFunctionPath))
      import(buttonFunctionPath).then(module => module.default(interaction))
  }
}

export async function removeEmptyVoiceChannelsOnStartup() {
  const activeVoiceChannels = await getActiveVoiceChannelIds()

  activeVoiceChannels.forEach(channel => {
    setTimeout(async () => {
      const voiceChannel = await getBot().channels.cache.get(
        channel.activeVoiceChannelId
      )
      removeVoiceChannelIfEmpty(voiceChannel)
    }, 30000)
  })
}

export async function checkVoiceChannelValidity(voiceState) {
  if (
    voiceState.channel &&
    (await channelWithVoiceChannelIsJoinable(voiceState.channelID)) &&
    voiceState.channel.members.size === 0
  ) {
    setTimeout(async () => {
      if (!voiceState.channel) return
      const voiceChannel = await voiceState.channel.guild.channels.cache.get(
        voiceState.channelID
      )
      removeVoiceChannelIfEmpty(voiceChannel)
    }, 30000)
  }
}
