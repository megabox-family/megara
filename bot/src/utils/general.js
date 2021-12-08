import { MessageActionRow, MessageButton } from 'discord.js'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { syncChannels } from './channels.js'
import { syncRoles, requiredRoleDifference } from './roles.js'
import { pushUserToQueue } from './required-role-queue.js'
import {
  syncGuilds,
  getCommandSymbol,
  getAnnouncementChannel,
  getLogChannelId,
} from '../repositories/guilds.js'
import {
  removeActiveVoiceChannelId,
  getCategoryName,
  getFormatedCommandChannels,
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

export async function startup(bot) {
  console.log(`Logged in as ${bot.user.tag}!`)

  // console.log(
  //   bot.guilds.cache
  //     .get(`711043006253367426`)
  //     .channels.cache.get(`914280421448105985`)
  //     .permissionOverwrites.cache.get(`917933076426928148`)
  // )

  cacheBot(bot)
  await syncGuilds(bot.guilds.cache)

  bot.guilds.cache.forEach(async guild => {
    await syncChannels(guild)
    await syncRoles(guild)
  })

  await removeEmptyVoiceChannelsOnStartup()
}

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

export async function logErrorMessageToChannel(errorMessage, guild) {
  const logChannelId = await getLogChannelId(guild.id)

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
  const guild = newChannel.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id)

  if (!announcementChannelId) return

  const commandChannels = await getFormatedCommandChannels(
    guild.id,
    `unrestricted`
  )

  const joinButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${newChannel.id}`)
        .setLabel(`Join ${newChannel.name}`)
        .setStyle('SUCCESS')
    ),
    categoryName = await getCategoryName(newChannel.parentId)
  guild.channels.cache.get(announcementChannelId).send({
    content: `
        @everyone Hey guys! 😁\
        \nWe've added a new channel, <#${newChannel.id}>, in the '${categoryName}' category.\
        \nPress the button below, or use the \`!join\` command (ex: \`!join ${newChannel.name}\`) to join.\
        \nThe \`!join\` command can be used in these channels: ${commandChannels}
      `,
    components: [joinButtonRow],
  })
}

export async function handleMessage(message) {
  const messageText = message.content

  if (
    ![
      `!`,
      `#`,
      `$`,
      `%`,
      `^`,
      `&`,
      `(`,
      `)`,
      `-`,
      `+`,
      `=`,
      `{`,
      `}`,
      `[`,
      `]`,
      `?`,
      `,`,
      `.`,
    ].includes(messageText.substring(0, 1))
  )
    return

  const commandSymbol = await getCommandSymbol(message.guild.id)

  if (messageText.substring(0, 1) !== commandSymbol) return

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
    import(textCommand.fullPath).then(module =>
      module.default(message, commandSymbol, args)
    )
  else
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )
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

export function modifyMember(oldMember, newMember) {
  const requiredRole = requiredRoleDifference(
    newMember.guild,
    oldMember._roles,
    newMember._roles
  )

  if (requiredRole)
    pushUserToQueue({
      guild: newMember.guild.id,
      role: requiredRole.name,
      user: newMember.id,
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
