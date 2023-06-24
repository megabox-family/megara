import {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OverwriteType,
  Collection,
  PermissionsBitField,
  PermissionOverwrites,
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
  getChannelNotificationsRoleId,
} from '../repositories/guilds.js'
import {
  createChannelRecord,
  updateChannelRecord,
  deleteChannelRecord,
  getChannelsByGuild,
  getAlphabeticalCategories,
  getAlphabeticalChannelsByCategory,
  getChannelType,
  getRoomChannelId,
  getUnverifiedRoomChannelId,
  getCategoryName,
  getPositionOverride,
} from '../repositories/channels.js'
import { getChannelBasename } from './voice.js'
import { queueApiCall } from '../api-queue.js'
import { isPositiveNumber } from './validation.js'
import { deleteVoiceRecord, getVoiceRecordById } from '../repositories/voice.js'

const setChannelFunction = {
    adminChannel: setAdminChannel,
    logChannel: setLogChannel,
    announcementChannel: setAnnouncementChannel,
    verificationChannel: setVerificationChannel,
    welcomeChannel: setWelcomeChannel,
  },
  channelSortingQueue = []

// Check this
async function emptyChannelSortingQueue() {
  if (channelSortingQueue.length === 0) return

  const guildId = channelSortingQueue[0]

  await sortChannels(guildId)

  channelSortingQueue.shift()

  // console.log(`channel sorting loop`)

  emptyChannelSortingQueue()
}

export function pushToChannelSortingQueue(guildId) {
  if (!channelSortingQueue.includes(guildId)) {
    channelSortingQueue.push(guildId)

    if (channelSortingQueue.length === 1) emptyChannelSortingQueue()
  }
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
    finalChannelArr = [],
    createAlphabeticalBucket = alphabeticalCategories.map(async category =>
      alphabeticalBuckets.push(
        await getAlphabeticalChannelsByCategory(category.id)
      )
    )

  await Promise.all(createAlphabeticalBucket)

  // console.log(alphabeticalBuckets)

  const createFinalChannelArr = alphabeticalBuckets.map(
    async alphabeticalBucket => {
      const channelsWithPositionOverrides = {},
        orderedChannels = [],
        channelsWithPositiveOverrides = [],
        channelsWithNegativeOverrides = [],
        voiceChannelsWithPositionOverrides = {},
        orderedVoiceChannels = [],
        voiceChannelsWithPositiveOverrides = [],
        voiceChannelsWithNegativeOverrides = [],
        createPositionOverrideArrays = alphabeticalBucket.map(async channel => {
          const positionOverride = await getPositionOverride(channel.id)

          if (positionOverride) {
            if (channel.channelType === `GuildVoice`)
              voiceChannelsWithPositionOverrides[channel.id] = positionOverride
            else channelsWithPositionOverrides[channel.id] = positionOverride
          }
        })

      await Promise.all(createPositionOverrideArrays)

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
        } else if (channel.channelType === `GuildVoice`)
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

      voiceChannelsWithPositiveOverrides.forEach(
        categoriesWithPositiveOverride =>
          orderedVoiceChannels.unshift(categoriesWithPositiveOverride.id)
      )

      voiceChannelsWithNegativeOverrides.forEach(
        categoriesWithNegativeOverride =>
          orderedVoiceChannels.push(categoriesWithNegativeOverride.id)
      )

      orderedChannels.forEach((channelId, index) =>
        finalChannelArr.push({ channel: channelId, position: index })
      )

      orderedVoiceChannels.forEach((channelId, index) =>
        finalChannelArr.push({ channel: channelId, position: index })
      )
    }
  )

  await Promise.all(createFinalChannelArr)

  const currentChannelPosition = finalChannelArr.map(channel => {
    const _channel = channels.get(channel.channel)

    if (!_channel)
      console.log(
        `This channel is deleted but we're trying to sort it: ${channel.channel}`
      )

    return {
      name: _channel?.name,
      channel: _channel?.id,
      position: _channel?.rawPosition,
    }
  })

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

export function checkIfChannelIsSuggestedType(channel, type) {
  const channelTypeKeys = Object.keys(ChannelType).filter(
    channelTypeKey => !isPositiveNumber(channelTypeKey)
  )

  const alphaChannelType = channelTypeKeys.find(
    channelTypeKey => ChannelType[channelTypeKey] === channel.type
  )

  return alphaChannelType?.match(type)
}

export async function handleCreateChannel(channel) {
  const channelIsThread = checkIfChannelIsSuggestedType(channel, `Thread`)

  if (channelIsThread) return

  await createChannelRecord(channel)

  announceNewChannel(channel)
}

export async function handleModifyChannel(oldChannel, newChannel) {
  const channelIsThread = checkIfChannelIsSuggestedType(oldChannel, `Thread`),
    { guild } = newChannel

  if (channelIsThread) return

  if (
    oldChannel.name !== newChannel.name ||
    oldChannel.parentId !== newChannel.parentId ||
    oldChannel.rawPosition !== newChannel.rawPosition ||
    oldChannel.position !== newChannel.position
  ) {
    pushToChannelSortingQueue(guild.id)
  }

  if (oldChannel.name !== newChannel.name) {
    await updateChannelRecord(newChannel)
  }
}

export async function handleDeleteChannel(channel) {
  const { id: channelId, guild } = channel

  if (await getVoiceRecordById(channelId)) {
    await deleteVoiceRecord(channelId)
  }

  const functionChannels = await getFunctionChannels(guild.id)

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

  const channelTable = await getChannelsByGuild(guild.id),
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

        deleteChannelRecord({ id: id }, true)
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
  const { parentId: newChannelParentId, guild } = newChannel,
    { id: guildId, channels, roles } = guild,
    pauseChannelNotifications = await getPauseChannelNotifications(guildId)

  if (pauseChannelNotifications) return

  const announcementChannelId = await getAnnouncementChannel(guildId)

  if (!announcementChannelId) return

  const channelType = checkType(newChannel),
    isVoiceChannel = channelType.match('Voice')

  if (isVoiceChannel) return

  const guildRolePermissions =
      newChannel.permissionOverwrites.cache.get(guildId),
    denyPermissions = guildRolePermissions?.deny.serialize()

  if (!denyPermissions?.ViewChannel) {
    const categoryName = await getCategoryName(newChannelParentId),
      announcementChannel = channels.cache.get(announcementChannelId),
      channelNotificationsRoleId = await getChannelNotificationsRoleId(guildId),
      channelNotificationsRole = roles.cache.get(channelNotificationsRoleId)

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(`channels & roles`)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/customize-community`)
    )

    if (announcementChannel)
      await queueApiCall({
        apiCall: `send`,
        djsObject: announcementChannel,
        parameters: {
          content:
            `${channelNotificationsRole ? channelNotificationsRole : ''}` +
            `\nA new channel has been created in the **${categoryName}** category ${newChannel} ← click here to view and join the channel 😁` +
            `\nYou can also join/leave channels or manage these notifications by clicking the button below.`,
          components: [buttonRow],
        },
      })
  }
}

export function checkIfMemberIsPermissible(channel, member) {
  const { guild, permissionOverwrites, type } = channel

  if (member.id === guild.ownerId) {
    return true
  }

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

  if (relevantOverwrites.length === 0) {
    const guildOverwrite = channelOverwrites.get(guildId),
      denyPermissions = guildOverwrite?.overwrite.deny.serialize()

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

export function convertSerialzedPermissionsToPermissionsBitfield(
  serializedPermissions
) {
  const permissionKeys = Object.keys(serializedPermissions),
    permissionsBitFieldFlags = []

  permissionKeys.forEach(permissionKey => {
    if (serializedPermissions[permissionKey])
      permissionsBitFieldFlags.push(PermissionsBitField.Flags[permissionKey])
  })

  const permissionsBitField = new PermissionsBitField(permissionsBitFieldFlags)

  return permissionsBitField
}

export function formatPositionOverrides(guild, positionOverrideRecords) {
  const positionOverrideObject = {}

  positionOverrideRecords.forEach(
    record => (positionOverrideObject[record.id] = record.positionOverride)
  )

  const guildCategories = guild.channels.cache.filter(channel => {
      channel.type === ChannelType.GuildCategory
    }),
    categoryBuckets = guildCategories.map(category => {
      const children = guild.channels.cache.filter(
          channel => channel.parentId === category.id
        ),
        childrenBucket = children.map(child => {
          return {
            id: child.id,
            name: child.name,
            positionOverride: positionOverrideObject[child.id],
          }
        })

      return {
        id: category.id,
        name: category.name,
        positionOverride: positionOverrideObject[category.id],
        children: childrenBucket,
      }
    })

  console.log(categoryBuckets)
}
