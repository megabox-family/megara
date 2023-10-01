import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPositionOverrides, syncChannels } from './channels.js'
import { pinMessage, unpinMessage } from './emoji.js'
import { registerSlashCommands } from './slash-commands.js'
import {
  syncGuilds,
  getLogChannel,
  getChannelNotificationsRoleId,
} from '../repositories/guilds.js'
import { isNotificationRole } from './validation.js'
import { registerContextCommands } from './context-commands.js'
import { getCommands } from '../cache-commands.js'
import { timoutMap, printPollResults } from './general-commands.js'
import { getPollStartTime, getRunningPolls } from '../repositories/polls.js'
import moment from 'moment-timezone'
import { syncRoles } from './roles.js'
import { syncVipMembers } from './members.js'
import { getUnconcludedPosts } from '../repositories/events.js'
import { concludeEvent } from '../slash-commands/schedule-event.js'

export const relativePath = dirname(fileURLToPath(import.meta.url)),
  srcPath = dirname(relativePath),
  slashCommandFolderName = `slash-commands`,
  slashCommandFiles = readdirSync(`${srcPath}/${slashCommandFolderName}`),
  contextCommandFolderName = `context-commands`,
  contextCommandFiles = readdirSync(`${srcPath}/${contextCommandFolderName}`),
  modalFolderName = `modal-commands`,
  modalCommandFiles = readdirSync(`${srcPath}/${modalFolderName}`),
  selectFolderName = `select-commands`,
  selectCommandFiles = readdirSync(`${srcPath}/${selectFolderName}`),
  modalCommands = modalCommandFiles.map(modalCommandFile => {
    return {
      baseName: basename(modalCommandFile, '.js'),
      fullPath: `${srcPath}/${modalFolderName}/${modalCommandFile}`,
    }
  }),
  selectCommands = selectCommandFiles.map(selectCommandFile => {
    return {
      baseName: basename(selectCommandFile, '.js'),
      fullPath: `${srcPath}/${selectFolderName}/${selectCommandFile}`,
    }
  }),
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
  }),
  collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

export async function startPollTimers() {
  const currentTime = moment().unix(),
    runningPolls = await getRunningPolls(currentTime)

  runningPolls?.forEach(poll => {
    const { id, channelId, endTime } = poll

    const millisecondDifference = (endTime - currentTime) * 1000,
      timeoutId = setTimeout(
        printPollResults.bind(null, channelId, id),
        millisecondDifference
      )

    timoutMap.set(id, timeoutId)
  })
}

export async function startEventTimers() {
  const currentTime = moment().unix(),
    unconcludedPosts = await getUnconcludedPosts()

  unconcludedPosts?.forEach(post => {
    const { id, parentId, endUnix } = post

    const millisecondDifference = (endUnix - currentTime) * 1000

    if (millisecondDifference < 0) {
      concludeEvent(parentId, id)

      return
    }

    setTimeout(concludeEvent.bind(null, parentId, id), millisecondDifference)
  })
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

export function getNotificationRoles(message) {
  const mentionedRoles = message.mentions.roles

  if (mentionedRoles.size === 0) return

  const guild = message.guild,
    notificationRoles = guild.roles.cache.filter(
      role => isNotificationRole(role.name) && mentionedRoles.has(role.id)
    )

  if (notificationRoles.size > 0) return notificationRoles
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

export function convertSecondsToDurationString(seconds) {
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor(((seconds % 86400) % 3600) / 60)

  let timeString = ''

  if (days > 0) timeString += `${days}d`

  if (hours > 0) timeString += ` ${hours}h`

  if (minutes > 0) timeString += ` ${minutes}m`

  return timeString
}
