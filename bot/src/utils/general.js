import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from '@discordjs/builders'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { syncChannels } from './channels.js'
import { syncVipMembers } from './members.js'
import { syncRoles } from './roles.js'
import { dynamicRooms } from './voice.js'
import { pinMessage, unpinMessage } from './emoji.js'
import { registerSlashCommands } from './slash-commands.js'
import {
  syncGuilds,
  getCommandSymbol,
  getVerificationChannel,
  getLogChannel,
  getNameGuidelines,
} from '../repositories/guilds.js'
import { removeActiveVoiceChannelId } from '../repositories/channels.js'
import {
  isNotificationRole,
  getNotificationRoleBasename,
} from './validation.js'
import { registerContextCommands } from './context-commands.js'
import { getCommands } from '../cache-commands.js'
import {
  generateChannelButtons,
  generateNotificationButtons,
} from './buttons.js'
import { pollTimeoutMap, printPollResults } from './general-commands.js'
import { getPollStartTime, getRunningPolls } from '../repositories/polls.js'
import moment from 'moment/moment.js'

const relativePath = dirname(fileURLToPath(import.meta.url)),
  srcPath = dirname(relativePath),
  slashCommandFolderName = `slash-commands`,
  slashCommandFiles = readdirSync(`${srcPath}/${slashCommandFolderName}`),
  contextCommandFolderName = `context-commands`,
  contextCommandFiles = readdirSync(`${srcPath}/${contextCommandFolderName}`),
  modalFolderName = `modal-commands`,
  modalCommandFiles = readdirSync(`${srcPath}/${modalFolderName}`),
  modalCommands = modalCommandFiles.map(modalCommandFile => {
    return {
      baseName: basename(modalCommandFile, '.js'),
      fullPath: `${srcPath}/${modalFolderName}/${modalCommandFile}`,
    }
  }),
  selectFolderName = `select-commands`,
  selectCommandFiles = readdirSync(`${srcPath}/${selectFolderName}`),
  selectCommands = selectCommandFiles.map(selectCommandFile => {
    return {
      baseName: basename(selectCommandFile, '.js'),
      fullPath: `${srcPath}/${selectFolderName}/${selectCommandFile}`,
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
  }),
  contextCommands = contextCommandFiles.map(contextCommandFile => {
    return {
      baseName: basename(contextCommandFile, '.js'),
      fullPath: `${srcPath}/${contextCommandFolderName}/${contextCommandFile}`,
    }
  })

export async function deleteNewRoles(guild) {
  const newRole = guild.roles.cache.find(role => role.name === `new role`)

  if (!newRole) return

  await newRole.delete().catch()

  await deleteNewRoles(guild)
}

async function startPollTimers() {
  const currentTime = moment().unix(),
    runningPolls = await getRunningPolls(currentTime)

  runningPolls?.forEach(poll => {
    const { id, channelId, endTime } = poll

    const millisecondDifference = (endTime - currentTime) * 1000,
      timeoutId = setTimeout(
        printPollResults.bind(null, channelId, id),
        millisecondDifference
      )

    pollTimeoutMap.set(id, timeoutId)
  })
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

  await registerSlashCommands(bot)
  await registerContextCommands(bot)

  const commands = getCommands()

  // console.log(commands)

  if (commands) {
    bot.application?.commands.set(commands)
  }

  await startPollTimers()

  const guild = bot.guilds.cache.get(`146109488745807873`),
    channel = guild.channels.cache.get(`639903044636639252`),
    message = await channel.messages.fetch(`1052409065764044850`),
    embed = message.embeds[0],
    newEmbed = new EmbedBuilder()
      .setTitle(
        `Should we create a single channel for all of Final Fantasy and use threads to differentiate games, or should we make independent channels for each major installment?`
      )
      .setDescription(embed?.data?.description)
      .setColor(embed?.data?.color)
      .setFields(embed?.data?.fields)

  console.log(newEmbed)

  // embed?.data?.title = `Should we create a single channel for all of Final Fantasy and use threads to differentiate games, or should we make independent channels for each major installment?`

  message.edit({ embeds: [newEmbed] })

  // console.log(message)
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

function checkIfMessageHasChannelMentions(message) {
  const mentionedChannels = message.mentions.channels

  if (mentionedChannels.size === 0) return

  return mentionedChannels
}

function checkIfMessageHasNotificationRole(message) {
  const mentionedRoles = message.mentions.roles

  if (mentionedRoles.size === 0) return

  const guild = message.guild,
    notificationRoles = guild.roles.cache.filter(
      role => isNotificationRole(role.name) && mentionedRoles.has(role.id)
    )

  if (notificationRoles.size > 0) return notificationRoles
}

export async function handleMessage(message) {
  let pollResults = false

  if (message.author.id === message.client.user.id) {
    const isPollReply = await getPollStartTime(message.reference?.messageId)

    if (isPollReply) pollResults = true
  }

  if (
    message.author.id === message.client.user.id &&
    message?.interaction?.commandName !== `poll` &&
    !pollResults
  )
    return

  if (!message?.guild) return

  const notificationRoles = checkIfMessageHasNotificationRole(message),
    mentionedChannels = checkIfMessageHasChannelMentions(message),
    channelNotification = notificationRoles?.find(
      notificationRole => notificationRole?.name === `-channel notifications-`
    )

  if (channelNotification && mentionedChannels) {
    const components = await generateChannelButtons(mentionedChannels)

    await message.reply({
      content: `
        Use the button(s) below to join/leave the channels mentioned in this message.\
        \nPS: You can also use the \`/channel-list\` command to join / leave channels at your leisure.
      `,
      components: components,
    })
  }

  if (notificationRoles) {
    const components = generateNotificationButtons(notificationRoles)

    await message.reply({
      content: `
        Use the button(s) below to unsubscribe from notification roles mentioned in this message.\
      `,
      components: components,
    })
  }
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
  } else if (interaction.isChatInputCommand()) {
    const slashCommand = slashCommands.find(
      slashCommand => slashCommand.baseName === interaction.commandName
    )

    import(slashCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isModalSubmit()) {
    const modalCommand = modalCommands.find(
      modalCommand => modalCommand.baseName === interaction.customId
    )

    import(modalCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isMessageContextMenuCommand()) {
    const contextCommand = contextCommands.find(
      contextCommand => contextCommand.baseName === interaction.commandName
    )

    import(contextCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isStringSelectMenu()) {
    const selectCommand = selectCommands.find(
      selectCommand => selectCommand.baseName === interaction.customId
    )

    import(selectCommand.fullPath).then(module => module.default(interaction))
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
