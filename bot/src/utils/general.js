import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { syncChannels } from './channels.js'
import { dynamicRooms } from './voice.js'
import { pinMessage, unpinMessage } from './emoji.js'
import { registerSlashCommands } from './slash-commands.js'
import {
  syncGuilds,
  getLogChannel,
  getChannelNotificationsRoleId,
} from '../repositories/guilds.js'
import { removeActiveVoiceChannelId } from '../repositories/channels.js'
import { isNotificationRole } from './validation.js'
import { registerContextCommands } from './context-commands.js'
import { getCommands } from '../cache-commands.js'
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

export const slashCommands = slashCommandFiles.map(slashCommandFile => {
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
  }),
  collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
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
  console.log(process.version)

  cacheBot(bot)
  await syncGuilds(bot.guilds.cache)

  bot.guilds.cache.forEach(async guild => {
    await deleteNewRoles(guild)
    await syncChannels(guild)
    // await syncRoles(guild)
    // await syncVipMembers(guild)
  })

  await registerSlashCommands(bot)
  await registerContextCommands(bot)

  const commands = getCommands()

  // console.log(commands)

  if (commands) {
    bot.application?.commands.set(commands)
  }

  await startPollTimers()

  // const guild = bot.guilds.cache.get(`1100538270263291904`),
  //   channel = guild.channels.cache.get(`1121600665790205975`)

  // const parentPermissionOverwrites =
  //   parentTextChannel.permissionOverwrites.cache

  // parentPermissionOverwrites.forEach(permissionOverwrite => {
  //   const allowPermissions = permissionOverwrite.allow.serialize(),
  //     denyPermissions = permissionOverwrite.deny.serialize()

  //   console.log(denyPermissions)
  // })

  //check that deny "view channel" permission is set to false

  // console.log(
  //   channel.permissionOverwrites.cache
  //     .get('1100538270263291904')
  //     .deny.serialize()
  // )
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

function getNotificationRoles(message) {
  const mentionedRoles = message.mentions.roles

  if (mentionedRoles.size === 0) return

  const guild = message.guild,
    notificationRoles = guild.roles.cache.filter(
      role => isNotificationRole(role.name) && mentionedRoles.has(role.id)
    )

  if (notificationRoles.size > 0) return notificationRoles
}

export async function handleMessage(message) {
  const { guild } = message
  if (!message?.guild) return

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

  const notificationRoles = getNotificationRoles(message)

  if (!notificationRoles) return

  const channelNotificationsRoleId = await getChannelNotificationsRoleId(
      guild.id
    ),
    hasChannelNotificationRole = notificationRoles.has(
      channelNotificationsRoleId
    )

  if (notificationRoles) {
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(
          hasChannelNotificationRole
            ? `channels & roles`
            : `manage notifications`
        )
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/customize-community`)
    )

    const parameters = {
      components: [buttonRow],
    }

    if (hasChannelNotificationRole)
      parameters.content = `You can join/leave channels or manage these notifications by clicking the button below.`

    await queueApiCall({
      apiCall: `reply`,
      djsObject: message,
      parameters,
    })
  }
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

export function formatNumber(
  number,
  useGrouping = true,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
    useGrouping: useGrouping,
  }).format(number)
}

export function extractElement(array, index) {
  const element = array[index],
    firstHalf = array.slice(0, index),
    secondHalf = array.slice(index + 1)

  array = [...firstHalf, ...secondHalf]

  return { array: array, element: element }
}
