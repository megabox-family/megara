import {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OverwriteType,
  PermissionsBitField,
  Collection,
} from 'discord.js'
import { getBot } from '../cache-bot.js'
import { comparePermissions } from '../utils/general.js'
import {
  getAdminChannel,
  getFunctionChannels,
  getChannelSorting,
  setAdminChannel,
  setLogChannel,
  setAnnouncementChannel,
  setVerificationChannel,
  setWelcomeChannel,
  getAnnouncementChannel,
  getWelcomeChannel,
  getPauseChannelNotifications,
} from '../repositories/guilds.js'
import {
  createChannelRecord,
  updateChannelRecord,
  deleteChannelRecord,
  getChannelTableByGuild,
  getAlphabeticalCategories,
  getAlphabeticalChannelsByCategory,
  getChannelsGuildById,
  getChannelType,
  getRoomChannelId,
  getUnverifiedRoomChannelId,
  getCategoryName,
} from '../repositories/channels.js'
import { getChannelBasename } from './voice.js'
import { queueApiCall } from '../api-queue.js'
import { isPositiveNumber } from './validation.js'

const setChannelFunction = {
    adminChannel: setAdminChannel,
    logChannel: setLogChannel,
    announcementChannel: setAnnouncementChannel,
    verificationChannel: setVerificationChannel,
    welcomeChannel: setWelcomeChannel,
  },
  channelSortingQueue = []

async function emptyChannelSortingQueue() {
  if (channelSortingQueue.length === 0) return

  await sortChannels(channelSortingQueue[0])

  channelSortingQueue.shift()

  console.log(`channel sorting loop`)

  emptyChannelSortingQueue()
}

export function pushToChannelSortingQueue(GuildId) {
  if (!channelSortingQueue.includes(GuildId)) {
    channelSortingQueue.push(GuildId)

    if (channelSortingQueue.length === 1) emptyChannelSortingQueue()
  }
}

export function getPositionOverride(channel) {
  const roles = channel.guild.roles.cache,
    channelPermissionOverwrites = channel.permissionOverwrites.cache,
    alphaPermissions = channelPermissionOverwrites.map(
      role => roles.get(role.id)?.name
    )

  const positionOverride = alphaPermissions.find(alphaPermission => {
    if (alphaPermission)
      return alphaPermission.match(`(?!!)position override(?=:)`)
  })

  return positionOverride ? +positionOverride.match(`-?[0-9]+`)[0] : null
}

export async function sortChannels(guildId) {
  if (!(await getChannelSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
    channels = guild.channels.cache.filter(
      channel =>
        ![ChannelType.PublicThread, ChannelType.PrivateThread].includes(
          channel.type
        )
    ),
    alphabeticalCategories = await getAlphabeticalCategories(guildId),
    alphabeticalBuckets = [alphabeticalCategories],
    finalChannelArr = []

  await Promise.all(
    alphabeticalCategories.map(async category =>
      alphabeticalBuckets.push(
        await getAlphabeticalChannelsByCategory(category.id)
      )
    )
  )

  alphabeticalBuckets.forEach(alphabeticalBucket => {
    const channelsWithPositionOverrides = {},
      orderedChannels = [],
      channelsWithPositiveOverrides = [],
      channelsWithNegativeOverrides = [],
      voiceChannelsWithPositionOverrides = {},
      orderedVoiceChannels = [],
      voiceChannelsWithPositiveOverrides = [],
      voiceChannelsWithNegativeOverrides = []

    channels.forEach(channel => {
      const positionOverride = getPositionOverride(channel)

      if (positionOverride) {
        if (channel.type === ChannelType.GuildVoice)
          voiceChannelsWithPositionOverrides[channel.id] = positionOverride
        else channelsWithPositionOverrides[channel.id] = positionOverride
      }
    })

    alphabeticalBucket.forEach(channel => {
      if (channelsWithPositionOverrides.hasOwnProperty(channel.id)) {
        if (channelsWithPositionOverrides[channel.id] > 0)
          channelsWithPositiveOverrides.push({
            id: channel.id,
            positionOverride: channelsWithPositionOverrides[channel.id],
          })
        else
          channelsWithNegativeOverrides.push({
            id: channel.id,
            positionOverride: channelsWithPositionOverrides[channel.id],
          })
      } else if (
        voiceChannelsWithPositionOverrides.hasOwnProperty(channel.id)
      ) {
        if (voiceChannelsWithPositionOverrides[channel.id] > 0)
          voiceChannelsWithPositiveOverrides.push({
            id: channel.id,
            positionOverride: voiceChannelsWithPositionOverrides[channel.id],
          })
        else
          voiceChannelsWithNegativeOverrides.push({
            id: channel.id,
            positionOverride: voiceChannelsWithPositionOverrides[channel.id],
          })
      } else if (channel.channelType === `voice`)
        orderedVoiceChannels.push(channel.id)
      else orderedChannels.push(channel.id)
    })

    channelsWithPositiveOverrides.sort((a, b) =>
      a.positionOverride > b.positionOverride ? -1 : 1
    )

    channelsWithNegativeOverrides.sort((a, b) =>
      a.positionOverride < b.positionOverride ? -1 : 1
    )

    channelsWithPositiveOverrides.forEach(categoriesWithPositiveOverride =>
      orderedChannels.unshift(categoriesWithPositiveOverride.id)
    )

    channelsWithNegativeOverrides.forEach(categoriesWithNegativeOverride =>
      orderedChannels.push(categoriesWithNegativeOverride.id)
    )

    voiceChannelsWithPositiveOverrides.sort((a, b) =>
      a.positionOverride > b.positionOverride ? -1 : 1
    )

    voiceChannelsWithNegativeOverrides.sort((a, b) =>
      a.positionOverride < b.positionOverride ? -1 : 1
    )

    voiceChannelsWithPositiveOverrides.forEach(categoriesWithPositiveOverride =>
      orderedVoiceChannels.unshift(categoriesWithPositiveOverride.id)
    )

    voiceChannelsWithNegativeOverrides.forEach(categoriesWithNegativeOverride =>
      orderedVoiceChannels.push(categoriesWithNegativeOverride.id)
    )

    orderedChannels.forEach((channelId, index) =>
      finalChannelArr.push({ channel: channelId, position: index })
    )

    orderedVoiceChannels.forEach((channelId, index) =>
      finalChannelArr.push({ channel: channelId, position: index })
    )
  })

  const currentChannelPosition = finalChannelArr.map(channel => {
    const _channel = channels.get(channel.channel)

    if (!_channel)
      console.log(
        `This channel is deleted but we're trying to sort it: ${channel.channel}`
      )

    return { channel: _channel?.id, position: _channel?.position }
  })

  console.log(`tried sorting channels`)

  if (
    JSON.stringify(finalChannelArr) !== JSON.stringify(currentChannelPosition)
  ) {
    console.log(`sorted channels`)

    await queueApiCall({
      apiCall: `setPositions`,
      djsObject: guild.channels,
      parameters: finalChannelArr,
    })
  }
}

export function checkType(channel) {
  const channelTypeKeys = Object.keys(ChannelType).filter(
      channelTypeKey => !isPositiveNumber(channelTypeKey)
    ),
    alphaChannelType = channelTypeKeys.find(
      channelTypeKey => ChannelType[channelTypeKey] === channel.type
    )

  return alphaChannelType
}

export function checkIfChannelTypeIsThread(channelType) {
  const channelTypeKeys = Object.keys(ChannelType).filter(
      channelTypeKey => !isPositiveNumber(channelTypeKey)
    ),
    theadChannelTypes = channelTypeKeys.filter(channelTypeKey =>
      channelTypeKey.match(`Thread`)
    )

  if (theadChannelTypes.includes(channelType)) return true

  return false
}

export async function createChannel(channel, skipAnnouncementAndSort = false) {
  const channelType = checkType(channel),
    channelIsThread = checkIfChannelTypeIsThread(channel)

  if (channelIsThread) return

  await createChannelRecord(channel, channelType)

  if (skipAnnouncementAndSort) {
    return channel.id
  }

  if (!channelSortingQueue.includes(channel.guild.id))
    pushToChannelSortingQueue(channel.guild.id)

  announceNewChannel(channel)
}

export async function modifyChannel(
  oldChannel,
  newChannel,
  skipAnnouncementAndSort = false
) {
  const oldChannelType = oldChannel.hasOwnProperty(`channelType`)
      ? oldChannel.channelType
      : checkType(oldChannel),
    channelIsThread = checkIfChannelTypeIsThread(oldChannelType)

  if (channelIsThread) return

  const oldCatergoryId = oldChannel.hasOwnProperty(`categoryId`)
      ? oldChannel.categoryId
      : oldChannel.parentId,
    newChannelType = checkType(newChannel)

  if (
    oldChannel.name !== newChannel.name ||
    oldCatergoryId !== newChannel.parentId ||
    oldChannelType !== newChannelType ||
    oldChannel.position !== newChannel.position ||
    (oldChannel?.rawPosition &&
      oldChannel.rawPosition !== newChannel.rawPosition)
  ) {
    await updateChannelRecord(newChannel, newChannelType)

    if (skipAnnouncementAndSort) {
      if (oldChannelType !== newChannelType) return newChannel.id
    } else {
      if (
        !channelSortingQueue.includes(newChannel.guild.id) &&
        (oldChannel.position !== newChannel.position ||
          (oldChannel?.rawPosition &&
            oldChannel.rawPosition !== newChannel.rawPosition) ||
          oldChannel.name !== newChannel.name)
      ) {
        pushToChannelSortingQueue(newChannel.guild.id)
      }

      if (oldChannelType !== newChannelType) {
        console.log(
          `Channel type ${oldChannelType} changed to ${newChannelType} in ${newChannel.name}.`
        )

        if (newChannelType !== `private`) announceNewChannel(newChannel)
      }
    }
  }
}

export async function deleteChannel(channel, skipSort = false) {
  let channelId

  if (channel?.id) channelId = channel.id
  else channelId = channel

  const guild = getBot().guilds.cache.get(
      await getChannelsGuildById(channelId)
    ),
    functionChannels = await getFunctionChannels(guild.id)

  Object.keys(functionChannels).forEach(key => {
    const channelName = key.match(`^[a-z]+`)[0]

    if (channelId === functionChannels[key]) {
      setChannelFunction[key](guild.id, null)

      if (key === `adminChannel`) {
        const owner = guild.members.cache.get(guild.ownerId)

        queueApiCall({
          apiCall: `send`,
          djsObject: owner,
          parameters:
            `You're receiving this message because you are the owner of the ${guild.name} server.` +
            `\nThe channel that was set as the admin channel was deleted at some point 🤔` +
            `\nTo receive important notifications from me in the server this needs to be set again.`,
        })
      } else {
        const adminChannel = guild.channels.cache.get(
          functionChannels.adminChannel
        )

        queueApiCall({
          apiCall: `send`,
          djsObject: adminChannel,
          parameters:
            `The channel that was set as the ${channelName} channel was deleted at some point 🤔` +
            `\nYou'll need to set this channel function again to gain its functionality.`,
        })
      }
    }
  })

  await deleteChannelRecord(channelId)
}

export async function syncChannels(guild) {
  const channels = guild.channels.cache,
    liveChannelIds = []

  channels.forEach(channel => {
    if (
      ![ChannelType.PublicThread, ChannelType.PrivateThread].includes(
        channel.type
      )
    )
      liveChannelIds.push(channel.id)
  })

  const channelTable = await getChannelTableByGuild(guild.id),
    tabledChannelIds = channelTable.map(row => row.id),
    allIds = [...new Set([...liveChannelIds, ...tabledChannelIds])],
    channelsToAnnounce = []

  let positionHasChanged = false

  await Promise.all(
    allIds.map(async id => {
      const channel = channels.get(id)

      if (liveChannelIds.includes(id) && !tabledChannelIds.includes(id)) {
        positionHasChanged = true

        const channelId = await createChannel(channel, true)
        if (channelId) channelsToAnnounce.push(channelId)
      } else if (
        !liveChannelIds.includes(id) &&
        tabledChannelIds.includes(id)
      ) {
        positionHasChanged = true

        deleteChannel({ id: id }, true)
      } else {
        const record = channelTable.find(row => {
            return row.id === id
          }),
          livePositionalOverride = getPositionOverride(channel)

        if (
          record.positionOverride !== livePositionalOverride ||
          record.positionHasChanged !== channel.position
        )
          positionHasChanged = true

        const channelId = await modifyChannel(record, channel, true)

        if (channelId) channelsToAnnounce.push(channelId)
      }
    })
  )

  if (positionHasChanged) pushToChannelSortingQueue(guild.id)

  if (channelsToAnnounce.length >= 5) {
    const adminChannelId = await getAdminChannel(guild.id),
      adminChannel = guild.channels.cache.get(adminChannelId)

    await queueApiCall({
      apiCall: `send`,
      djsObject: adminChannel,
      parameters: `Potential oopsie detected. More than five channels were marked for announcement:
      ${channelsToAnnounce.join(', ')}`,
    })
  } else {
    channelsToAnnounce.forEach(channelToAnnounce => {
      announceNewChannel(channelToAnnounce)
    })
  }
}

export async function addMemberToDynamicChannels(
  member,
  permissions,
  parentChannelName
) {
  const guild = member.guild,
    channels = guild.channels.cache,
    dynamicVoiceChannels = channels.filter(
      channel =>
        getChannelBasename(channel.name) === parentChannelName &&
        channel.type === ChannelType.GuildVoice
    )

  for (const [voiceChannelId, voiceChannel] of dynamicVoiceChannels) {
    await new Promise(resolution => setTimeout(resolution, 5000))

    if (voiceChannel)
      await voiceChannel.permissionOverwrites
        .create(member, permissions)
        .catch(error =>
          console.log(
            `I was unable to add a member to a dynamic voice channel, it was probably deleted as I was adding them:\n${error}`
          )
        )
  }
}

export async function CheckIfMemberNeedsToBeAdded(
  member,
  channelId,
  temporary = false
) {
  if (!channelId) return

  const guild = member.guild,
    welcomeChannelId = await getWelcomeChannel(guild.id),
    roomChannelId = await getRoomChannelId(guild.id),
    unverifiedRoomId = await getUnverifiedRoomChannelId(guild.id)

  if ([welcomeChannelId, roomChannelId, unverifiedRoomId].includes(channelId))
    return

  const channel = guild.channels.cache.get(channelId)

  if (!channel) return `not added`

  const channelType = await getChannelType(channel.id)

  if (channelType === `hidden`) return

  const userOverwrite = channel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === member.id
    ),
    comparedPermissions = comparePermissions(userOverwrite),
    allowPermissions = userOverwrite?.allow.serialize()

  if (channelType === `archived`) {
    const archivedPermissions = {
      ViewChannel: true,
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePrivateThreads: false,
      CreatePublicThreads: false,
    }

    if (!userOverwrite)
      return { action: `create`, permissions: archivedPermissions }
    else if (
      !comparedPermissions.ViewChannel ||
      comparedPermissions.SendMessages ||
      comparedPermissions.SendMessagesInThreads ||
      comparedPermissions.CreatePrivateThreads ||
      comparedPermissions.CreatePublicThreads
    )
      return { action: `edit`, permissions: archivedPermissions }
  } else if (channelType === `joinable`) {
    const joinablePermissions = temporary
      ? { ViewChannel: true, SendMessages: true }
      : { ViewChannel: true, SendMessages: null }

    if (!userOverwrite)
      return { action: `create`, permissions: joinablePermissions }
    else if (!comparedPermissions.ViewChannel || allowPermissions.SendMessages)
      return { action: `edit`, permissions: joinablePermissions }
  } else if (channelType === `public`) {
    if (temporary) {
      if (userOverwrite && comparedPermissions?.ViewChannel === false)
        return {
          action: `edit`,
          permissions: {
            ViewChannel: true,
            SendMessages: true,
          },
        }
    } else {
      if (userOverwrite) {
        return { action: `delete` }
      }
    }
  } else if (channelType === `private`) {
    const privatePermissions = { ViewChannel: true }

    if (!userOverwrite || !comparedPermissions.ViewChannel) {
      return { action: `create`, permissions: privatePermissions }
    }
  }

  return `already added`
}

export async function addMemberToChannel(member, channelId) {
  if (!channelId) return

  const guild = member.guild,
    channel = guild.channels.cache.get(channelId)

  if (!channel) return false

  const isMemberPermissible = checkIfMemberIsPermissible(channel, member)

  if (isMemberPermissible) return

  await queueApiCall({
    apiCall: `create`,
    djsObject: channel.permissionOverwrites,
    parameters: [member, { ViewChannel: true }],
    multipleParameters: true,
  })

  return true
}

export async function removeMemberFromDynamicChannels(
  member,
  parentChannelName
) {
  const guild = member.guild,
    channels = guild.channels.cache,
    dynamicVoiceChannels = channels.filter(
      channel =>
        getChannelBasename(channel.name) === parentChannelName &&
        channel.type === ChannelType.GuildVoice
    )

  for (const [voiceChannelId, voiceChannel] of dynamicVoiceChannels) {
    await new Promise(resolution => setTimeout(resolution, 5000))

    if (voiceChannel)
      await voiceChannel.permissionOverwrites
        .delete(member)
        .catch(error =>
          console.log(
            `I was unable to remove a member from a dynamic voice channel, it was probably deleted as I was removing them:\n${error}`
          )
        )
  }
}

export async function checkIfMemberneedsToBeRemoved(member, channel) {
  const guild = member.guild,
    channelId = channel?.id,
    welcomeChannelId = await getWelcomeChannel(guild.id)

  if (channelId === welcomeChannelId) return `welcome`

  if (!channel) return false

  const isPermissible = checkIfMemberIsPermissible(channel, member)

  if (isPermissible) return true

  return false
}

export async function removeMemberFromChannel(member, channel) {
  if (!member || !channel) return false

  const needsToBeRemoved = await checkIfMemberneedsToBeRemoved(member, channel)

  if (!needsToBeRemoved || needsToBeRemoved === `welcome`)
    return needsToBeRemoved

  await queueApiCall({
    apiCall: `create`,
    djsObject: channel.permissionOverwrites,
    parameters: [member, { ViewChannel: false }],
    multipleParameters: true,
  })

  return true
}

export async function announceNewChannel(newChannel) {
  const {
      id: newChannelId,
      name: newChannelName,
      parentId: newChannelParentId,
      guild,
    } = newChannel,
    { id: guildId, channels, roles } = guild,
    pauseChannelNotifications = await getPauseChannelNotifications(guildId)

  if (pauseChannelNotifications) return

  const announcementChannelId = await getAnnouncementChannel(guildId)

  if (!announcementChannelId) return

  const welcomeChannelId = await getWelcomeChannel(guildId)

  if (
    welcomeChannelId === newChannelId ||
    [`rooms`, `unverified-rooms`].includes(newChannel.name)
  )
    return

  const channelType = await getChannelType(newChannelId)

  if ([`category`, `hidden`, `private`, `voice`].includes(channelType)) return

  const channelNotificationSquad = roles.cache.find(
      role => role.name === `-channel notifications-`
    ),
    { id: channelNotificationRoleId } = channelNotificationSquad,
    categoryName = await getCategoryName(newChannelParentId),
    announcementChannel = channels.cache.get(announcementChannelId),
    joinButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!join-channel: ${newChannelId}`)
        .setLabel(`Join ${newChannelName}`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`!unsubscribe: ${channelNotificationRoleId}`)
        .setLabel(`Unsubscribe from channel notifications`)
        .setStyle(ButtonStyle.Secondary)
    ),
    leaveButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!leave-channel: ${newChannelName}`)
        .setLabel(`Leave ${newChannelName}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`!unsubscribe: ${channelNotificationRoleId}`)
        .setLabel(`Unsubscribe from channel notifications`)
        .setStyle(ButtonStyle.Secondary)
    )

  let channelTypeMessage,
    buttonRow = joinButtonRow

  switch (channelType) {
    case `public`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      buttonRow = leaveButtonRow
      break
    case `joinable`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      break
    default:
      channelTypeMessage = `A channel has been archived`
      buttonRow = leaveButtonRow
  }

  if (announcementChannel)
    announcementChannel.send({
      content:
        `${channelNotificationSquad}` +
        `\n${channelTypeMessage}, **${newChannelName}**, in the **${categoryName}** category 😁`,
      components: [buttonRow],
    })
}

export function checkIfMemberIsPermissible(channel, member) {
  const { guild, permissionOverwrites, type } = channel

  const relevantPermissions = []

  switch (type) {
    case ChannelType?.GuildVoice:
      relevantPermissions.push(`ViewChannel`, `Connect`)
      break
    default:
      relevantPermissions.push(`ViewChannel`)
  }

  const { id: guildId, roles } = guild,
    roleCache = roles.cache,
    channelOverwrites = permissionOverwrites.cache,
    relevantOverwrites = channelOverwrites
      .filter(overwrite => {
        const { id } = overwrite

        return (
          member._roles.includes(id) ||
          id === member.id ||
          roleCache.get(id)?.name === `@everyone`
        )
      })
      .map(overwrite => {
        const { id } = overwrite

        if (id === member.id)
          return {
            position: roleCache.size + 1,
            overwrite: overwrite,
          }
        else
          return {
            position: roleCache.get(id).position,
            overwrite: overwrite,
            role: roleCache.get(id),
          }
      }),
    collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })

  // console.log(channel)

  if (relevantOverwrites.length === 0) {
    const guildOverwrite = channelOverwrites.get(guildId),
      denyPermissions = guildOverwrite?.overwrite.deny.serialize()

    console.log(`made it`)

    if (
      relevantPermissions.some(permission => {
        const existingPermission = denyPermissions?.[permission]
      })
    )
      return false
    else return true
  }

  relevantOverwrites.sort((a, b) => collator.compare(b.position, a.position))

  const memberOverwrite =
    relevantOverwrites[0]?.overwrite.type === OverwriteType.Member
      ? relevantOverwrites[0].overwrite
      : null

  const collectionStartingPoint = relevantPermissions.map(permission => [
      permission,
      undefined,
    ]),
    permissionCollection = new Collection(collectionStartingPoint)

  if (memberOverwrite) {
    const allowPermissions = memberOverwrite.allow.serialize()

    relevantPermissions.forEach(permission => {
      permissionCollection.set(permission, allowPermissions?.[permission])
    })

    relevantOverwrites.shift()
  }

  for (const relevantOverwrite of relevantOverwrites) {
    if (permissionCollection.every(permission => permission !== undefined))
      break

    const allowPermissions = relevantOverwrite.overwrite.allow.serialize(),
      denyPermissions = relevantOverwrite.overwrite.deny.serialize(),
      rolePermissions = relevantOverwrite?.role
        ? relevantOverwrite.role.permissions.serialize()
        : roleCache.get(relevantOverwrite?.id)

    const _permissionCollection = new Collection(collectionStartingPoint)

    relevantPermissions.forEach(permission => {
      if (!allowPermissions?.[permission] && !denyPermissions?.[permission]) {
        if (rolePermissions?.[permission])
          _permissionCollection.set(permission, true)
        else _permissionCollection.set(permission, false)
      } else
        _permissionCollection.set(permission, allowPermissions?.[permission])
    })

    relevantPermissions.forEach(permission => {
      if (permissionCollection.get(permission) === undefined) {
        if (_permissionCollection.get(permission))
          permissionCollection.set(permission, true)
        else permissionCollection.set(permission, false)
      }
    })
  }

  if (permissionCollection.every(permission => permission === true)) return true
  else return false
}

export function isChannelThread(channel) {
  if (!channel) return

  const threadChannelTypes = [
    ChannelType.PrivateThread,
    ChannelType.PublicThread,
    ChannelType.GuildStageVoice,
    ChannelType.GuildVoice,
  ]

  if (threadChannelTypes.includes(channel?.type)) return true

  return false
}
