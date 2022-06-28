import { MessageActionRow, MessageButton, Constants } from 'discord.js'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { directMessageError } from '../utils/error-logging.js'
import { syncChannels } from './channels.js'
import { syncVipMembers } from './members.js'
import { syncRoles } from './roles.js'
import { dynamicRooms } from './voice.js'
import { pinMessage, unpinMessage } from './emoji.js'
import { registerSlashCommands } from './slash-commands.js'
import {
  syncGuilds,
  getCommandSymbol,
  getAnnouncementChannel,
  getVerificationChannel,
  getLogChannel,
  getRules,
  getNameGuidelines,
  getWelcomeChannel,
} from '../repositories/guilds.js'
import {
  removeActiveVoiceChannelId,
  getCategoryName,
  getFormatedCommandChannels,
  getChannelType,
} from '../repositories/channels.js'
import {
  isNotificationRole,
  getRoleIdsFromMessage,
  getNotificationRoleBasename,
} from './validation.js'

const relativePath = dirname(fileURLToPath(import.meta.url)),
  srcPath = dirname(relativePath),
  textCommandFolderName = `text-commands`,
  textCommandFiles = readdirSync(`${srcPath}/${textCommandFolderName}`),
  textCommands = textCommandFiles.map(textCommandFile => {
    return {
      baseName: basename(textCommandFile, '.js').replace(/-/g, ``),
      fullPath: `${srcPath}/${textCommandFolderName}/${textCommandFile}`,
    }
  }),
  slashCommandFolderName = `slash-commands`,
  slashCommandFiles = readdirSync(`${srcPath}/${slashCommandFolderName}`),
  modalFolderName = `modal-commands`,
  modalCommandFiles = readdirSync(`${srcPath}/${modalFolderName}`),
  modalCommands = modalCommandFiles.map(modalCommandFile => {
    return {
      baseName: basename(modalCommandFile, '.js'),
      fullPath: `${srcPath}/${modalFolderName}/${modalCommandFile}`,
    }
  })

export const validCommandSymbols = [
    `!`,
    `$`,
    `%`,
    `^`,
    `&`,
    `-`,
    `+`,
    `=`,
    `?`,
    `.`,
  ],
  slashCommands = slashCommandFiles.map(slashCommandFile => {
    return {
      baseName: basename(slashCommandFile, '.js'),
      fullPath: `${srcPath}/${slashCommandFolderName}/${slashCommandFile}`,
    }
  })

export async function deleteNewRoles(guild) {
  const newRole = guild.roles.cache.find(role => role.name === `new role`)

  if (!newRole) return

  await newRole.delete().catch()

  await deleteNewRoles(guild)
}

export async function startup(bot) {
  console.log(`Logged in as ${bot.user.tag}!`)

  cacheBot(bot)
  await syncGuilds(bot.guilds.cache)

  bot.guilds.cache.forEach(async guild => {
    await deleteNewRoles(guild)
    await syncChannels(guild)
    await syncRoles(guild)
    await syncVipMembers(guild)
  })

  registerSlashCommands(bot)

  // const guild = bot.guilds.cache.get(`711043006253367426`),
  //   channel = guild.channels.cache.get(`711043007545081949`),
  //   thread = channel.threads.cache.get(`983291433001840660`),
  //   members = thread.members.cache

  // console.log(members)
}

export async function logMessageToChannel(message) {
  const logChannelId = getLogChannel(message.guild.id)

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
  const logChannelId = await getLogChannel(guild.id)

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

  const welcomeChannelId = await getWelcomeChannel(guild.id)

  if (
    welcomeChannelId === newChannel.id ||
    [`rooms`, `unverified-rooms`].includes(newChannel.name)
  )
    return

  const channelType = await getChannelType(newChannel.id)

  if ([`category`, `hidden`, `private`, `voice`].includes(channelType)) return

  const channelNotificationSquad = guild.roles.cache.find(
      role => role.name === `-channel notifications-`
    ),
    commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    ),
    categoryName = await getCategoryName(newChannel.parentId),
    announcementChannel = guild.channels.cache.get(announcementChannelId),
    commandSymbol = await getCommandSymbol(guild.id),
    buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${newChannel.id}`)
        .setLabel(`Join ${newChannel.name}`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${channelNotificationSquad.id}`)
        .setLabel(`Unsubscribe from channel notifications`)
        .setStyle('SECONDARY')
    )

  let channelTypeMessage, channelTypeDetails, command

  switch (channelType) {
    case `public`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      channelTypeDetails = `By default, all members are added to public channels.`
      break
    case `joinable`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      channelTypeDetails = `By default, members are not added to joinable channels.`
      break
    default:
      channelTypeMessage = `A channel has been archived`
      channelTypeDetails =
        `Messages cannot be sent in archived channels, but you can still access them to view message history. ` +
        `By default, members are not removed from archived channels unless the channel was previously public.`
  }

  if (announcementChannel)
    announcementChannel.send({
      content: `
        ${channelNotificationSquad} Hey guys! 😁\
        \n${channelTypeMessage}, **<#${newChannel.id}>**, in the **${categoryName}** category. ${channelTypeDetails} \

        \nUse the buttons below this message to join **<#${newChannel.id}>** and or to manage these notifications. You can also join and leave channels using the \`/channel-list\` command.
      `,
      components: [buttonRow],
    })
}

function generateNotificationButtons(notificationRoles) {
  const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
    buttons = [],
    rows = []

  notificationRoles.sort((a, b) => collator.compare(a.name, b.name))

  let counter = 0

  for (const [roleId, role] of notificationRoles) {
    if (counter === 25) break

    buttons.push(
      new MessageButton()
        .setCustomId(`!unsubscribe: ${role.id}`)
        .setLabel(`Unsubscribe from ${getNotificationRoleBasename(role.name)}`)
        .setStyle('SECONDARY')
    )
    counter++
  }

  const chunkSize = 4
  for (let i = 0; i < buttons.length; i += chunkSize) {
    rows.push(
      new MessageActionRow().addComponents(buttons.slice(i, i + chunkSize))
    )
  }

  return rows
}

function checkIfMessageHasNotificationRole(message) {
  if (!message?.content) return

  const roleTags = getRoleIdsFromMessage(message.content)

  if (!roleTags) return

  const guild = message.guild,
    notificationRoles = guild.roles.cache.filter(
      role => isNotificationRole(role.name) && roleTags.includes(role.id)
    )

  if (notificationRoles.size > 0) return notificationRoles
}

export async function handleMessage(message) {
  if (message.author.id === message.client.user.id) return
  if (!message?.guild) return

  const guild = message.guild,
    messageText = message.content,
    notificationRoles = checkIfMessageHasNotificationRole(message)

  if (notificationRoles) {
    const components = generateNotificationButtons(notificationRoles)

    message.reply({
      content: `
        Use the buttons below to unsubscribe from notification roles mentioned in this message.\
      `,
      components: components,
    })
  }

  if (!validCommandSymbols.includes(messageText.substring(0, 1))) return

  const commandSymbol = await getCommandSymbol(message.guild.id)

  if (
    messageText.substring(0, 1) !== commandSymbol ||
    !messageText.substring(1, 2).match(`[0-9]|[a-zA-z]`)
  )
    return

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
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰\
        
        \n*Keep in mind that most commands are now slash commands, type \`/\` to get a list of available slash commands in this channel.*
      `
    )
}

export async function sendVerificationInstructions(guildMember) {
  const guild = guildMember.guild,
    verificationChannelId = await getVerificationChannel(guild.id),
    verificationChannel = guild.channels.cache.get(verificationChannelId),
    undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    )?.id,
    commandSymbol = await getCommandSymbol(guild.id),
    nameGuidelines = await getNameGuidelines(guild.id)

  if (!verificationChannel || !undergoingVerificationRoleId) return

  await guildMember.roles.add(undergoingVerificationRoleId)

  if (nameGuidelines)
    verificationChannel.send(
      `\
          \n<@${guildMember.id}>\
          \nBefore I can give you full access to the server you'll need to set your nickname, don't worry it's a piece of cake! 🍰\
  
          \nFirstly, please read over ${guild.name}'s name guidelines:\
          \n${nameGuidelines}\
  
          \nLastly, set your name by using the \`/set-name\` command like this \`/set-name [your name]\`, ex: \`/set-name John\`\

          \n*Hint: if you're confused as to how this works, scroll up to see how others have been verified in this channel.*
        `
    )
  else
    verificationChannel.send(
      `\
          \n<@${guildMember.id}>\
          \nBefore I can give you full access to the server you'll need to set your nickname, don't worry it's a piece of cake! 🍰\
          \nTo set your name simply use the \`/set-name\` command like this \`/set-name [your name]\`, ex: \`/set-name John\`\

          \n*Hint: Type \`/\` to see available commands, one you start to type 'set-nick' it should come up, then entire your name in the \`name\` field.*
        `
    )
}

export async function handleNewMember(guildMember) {
  const guild = guildMember.guild,
    rules = await getRules(guild.id),
    tosButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!accept-rules: ${guildMember.guild.id}`)
        .setLabel(`Accept`)
        .setStyle('SUCCESS'),
      new MessageButton()
        .setCustomId(`!deny-rules: ${guildMember.guild.id}`)
        .setLabel(`Deny`)
        .setStyle('DANGER')
    )

  if (rules) {
    guildMember
      .send({
        content: `\
        \n👋 **You've been invited to join the ${guild.name} server!** 😄\

        \nBefore I can give you full access to the server's full functionality you'll need to accept their rules:\
        \n${rules}\

        \nDo you accept or deny their rules? Note that if you deny their rules you will be removed from their server.\

        \n*Hint: click one of the buttons below to accept or deny ${guild.name}'s rules.*
      `,
        components: [tosButtonRow],
      })
      .catch(error => directMessageError(error, guildMember))

    return
  }

  sendVerificationInstructions(guildMember)
}

export async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const buttonFunctionPath = `${srcPath}/button-commands/${
      interaction.customId.match(`(?!!).+(?=:\\s|:$)`)[0]
    }.js`

    if (existsSync(buttonFunctionPath))
      await import(buttonFunctionPath).then(module =>
        module.default(interaction)
      )

    interaction.update({}).catch(error => {
      if (
        ![
          `The reply to this interaction has already been sent or deferred.`,
          `Interaction has already been acknowledged.`,
        ].includes(error.message)
      )
        console.log(error.message)
    })
  } else if (interaction.isCommand()) {
    const slashCommand = slashCommands.find(
      slashCommand => slashCommand.baseName === interaction.commandName
    )

    import(slashCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isModalSubmit()) {
    const modalCommand = modalCommands.find(
      modalCommand => modalCommand.baseName === interaction.customId
    )

    import(modalCommand.fullPath).then(module => module.default(interaction))
  }
}

export async function handleVoiceUpdate(oldState, newState) {
  dynamicRooms(oldState, newState)
}

export function getIndividualPermissionSets(overwrite) {
  const allow = overwrite.allow.serialize(),
    deny = overwrite.deny.serialize(),
    permissionKeys = Object.keys(allow),
    permissionSets = {
      allow: new Set(),
      deny: new Set(),
    }

  permissionKeys.forEach(key => {
    if (allow[key]) permissionSets.allow.add(key)
    else if (deny[key]) {
      permissionSets.deny.add(key)
    }
  })

  return permissionSets
}

export function comparePermissions(permission) {
  if (!permission) return

  const individualAllowPermissions = permission.allow.serialize(),
    individualDenyPermissions = permission.deny.serialize(),
    permissionKeys = Object.keys(individualAllowPermissions),
    individualPermissions = {}

  permissionKeys.forEach(key => {
    if (individualAllowPermissions[key] === individualDenyPermissions[key])
      individualPermissions[key] = 1
    else individualPermissions[key] = individualAllowPermissions[key]
  })

  return individualPermissions
}

export async function handleReactionAdd(reaction, user) {
  pinMessage(reaction, user)
}

export async function handleReactionRemove(reaction, user) {
  unpinMessage(reaction, user)
}
