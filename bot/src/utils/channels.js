import {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OverwriteType,
  Collection,
  PermissionsBitField,
} from 'discord.js'
import { getBot } from '../cache-bot.js'
import { collator } from '../utils/general.js'
import {
  getChannelSorting,
  getAnnouncementChannel,
  getWelcomeChannel,
  getPauseChannelNotifications,
  getChannelNotificationsRoleId,
} from '../repositories/guilds.js'
import {
  setChannelRecordName,
  deleteChannelRecord,
  getChannelsByGuild,
  getPositionOverride,
  getPositionOverrideRecords,
  getVoiceChannelParentId,
  removeCustomVoiceOptionsByParentId,
  createChannelRecord,
} from '../repositories/channels.js'
import { queueApiCall } from '../api-queue.js'
import { isPositiveNumber } from './validation.js'

const channelSortingQueue = new Collection()

let sortCount = 0

async function emptyChannelSortingQueue() {
  if (channelSortingQueue.size === 0) return

  const context = channelSortingQueue.first(),
    { guildId } = context

  channelSortingQueue.delete(guildId)

  await sortChannels(context)

  emptyChannelSortingQueue()
}

export async function pushToChannelSortingQueue(context) {
  const { guildId, bypassComparison } = context,
    { guildId: _guildId, bypassComparison: _bypassComparison } =
      channelSortingQueue.get(guildId) || {}

  if (!_guildId || (_bypassComparison === false && bypassComparison)) {
    // await new Promise(resolution => setTimeout(resolution, 2000))

    channelSortingQueue.set(guildId, context)

    if (channelSortingQueue.size === 1) emptyChannelSortingQueue()
  }
}

export function createPositionArray(categoryBuckets) {
  const positions = []

  categoryBuckets.forEach((categoryBucket, index) => {
    const { children } = categoryBucket

    positions.push({
      name: categoryBucket.name,
      channel: categoryBucket.id,
      position: index,
    })

    children.forEach((child, jndex) =>
      positions.push({
        name: child.name,
        channel: child.id,
        position: jndex,
      })
    )
  })

  return positions
}

export async function sortChannels(context) {
  const { guildId, bypassComparison } = context

  if (!(await getChannelSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
    newCategoryBuckets = await getCategoryBuckets(guild),
    newChannelPositions = createPositionArray(newCategoryBuckets)

  if (bypassComparison) {
    console.log(`sorted channels ${sortCount++}`)

    await queueApiCall({
      apiCall: `setPositions`,
      djsObject: guild.channels,
      parameters: newChannelPositions,
    })

    return
  }

  const currentCategoryBuckets = await getCategoryBuckets(guild, false),
    currentChannelPositions = createPositionArray(currentCategoryBuckets),
    comparableCurrentPositions = newChannelPositions.map(newChannelPosition => {
      return currentChannelPositions.find(
        currentChannelPositions =>
          currentChannelPositions.channel === newChannelPosition.channel
      )
    })

  // console.log(newChannelPositions, currentChannelPositions)

  if (
    JSON.stringify(newChannelPositions) !==
      JSON.stringify(comparableCurrentPositions) ||
    bypassComparison
  ) {
    console.log(`sorted channels ${sortCount++}`)

    await queueApiCall({
      apiCall: `setPositions`,
      djsObject: guild.channels,
      parameters: newChannelPositions,
    })
  }
}

export function getAlphaChannelType(channel) {
  if (!channel) return

  const channelTypeKeys = Object.keys(ChannelType).filter(
    channelTypeKey => !isPositiveNumber(channelTypeKey)
  )

  const alphaChannelType = channelTypeKeys.find(
    channelTypeKey => ChannelType[channelTypeKey] === channel.type
  )

  return alphaChannelType
}

export function checkIfChannelIsSuggestedType(channel, alphaType) {
  const alphaChannelType = getAlphaChannelType(channel)

  return alphaChannelType?.toLowerCase()?.match(alphaType.toLowerCase())
}

export async function syncChannels(guild) {
  const channels = guild.channels.cache,
    liveChannelIds = []

  channels.forEach(channel => {
    // checkIfChannel
    if (!checkIfChannelIsSuggestedType(channel, `thread`))
      liveChannelIds.push(channel.id)
  })

  const channelTable = await getChannelsByGuild(guild.id),
    tabledChannelIds = channelTable.map(row => row.id),
    allIds = [...new Set([...liveChannelIds, ...tabledChannelIds])]

  let positionHasChanged = false

  await Promise.all(
    allIds.map(async id => {
      const channel = channels.get(id)

      if (liveChannelIds.includes(id) && !tabledChannelIds.includes(id)) {
        positionHasChanged = true

        await createChannelRecord(channel)
      } else if (
        !liveChannelIds.includes(id) &&
        tabledChannelIds.includes(id)
      ) {
        positionHasChanged = true

        const voiceChannelParentId = await getVoiceChannelParentId(id)

        if (voiceChannelParentId) {
          await removeCustomVoiceOptionsByParentId(voiceChannelParentId)
        }

        await deleteChannelRecord(id)
      } else {
        const record = channelTable.find(row => {
            return row.id === id
          }),
          livePositionalOverride = getPositionOverride(channel)

        if (
          record.positionOverride !== livePositionalOverride ||
          record.positionHasChanged !== channel.rawPosition
        )
          positionHasChanged = true

        if (record.name !== channel.name) {
          await setChannelRecordName(channel)
        }
      }
    })
  )

  if (positionHasChanged)
    pushToChannelSortingQueue({ guildId: guild.id, bypassComparison: true })
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

  const isVoiceChannel = checkIfChannelIsSuggestedType(newChannel, `voice`)

  if (isVoiceChannel) return

  const guildRolePermissions =
      newChannel.permissionOverwrites.cache.get(guildId),
    denyPermissions = guildRolePermissions?.deny.serialize()

  if (!denyPermissions?.ViewChannel) {
    const categoryName = guild.channels.cache.get(newChannelParentId)?.name,
      announcementChannel = channels.cache.get(announcementChannelId),
      channelNotificationsRoleId = await getChannelNotificationsRoleId(guildId),
      channelNotificationsRole = roles.cache.get(channelNotificationsRoleId)

    if (announcementChannel)
      await queueApiCall({
        apiCall: `send`,
        djsObject: announcementChannel,
        parameters: {
          content:
            `${channelNotificationsRole ? channelNotificationsRole : ''} ` +
            `a new channel has been created in the **${categoryName}** category ${newChannel} ← click here to view and join the channel 😁` +
            `\n\n- manage notifications → <id:customize>` +
            `\n- manage channel list → <id:browse>`,
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

export function getPositionOverrideSort(positionOverride) {
  let positionOverrideSort

  if (positionOverride === undefined) {
    positionOverrideSort = 10000
  } else if (positionOverride > 0) positionOverrideSort = positionOverride
  else {
    const invertedOverride = positionOverride * -1

    positionOverrideSort = 100000 - invertedOverride
  }

  return positionOverrideSort
}

export async function getCategoryBuckets(
  guild,
  sortByOverrides = true,
  filterForOverrides = false
) {
  const positionOverrideRecords = await getPositionOverrideRecords(guild.id),
    positionOverrideObject = {}

  positionOverrideRecords.forEach(
    record => (positionOverrideObject[record.id] = record.positionOverride)
  )

  const guildCategories = guild.channels.cache.filter(
    channel => channel.type === ChannelType.GuildCategory
  )

  // construct category buckets
  let categoryBuckets = guildCategories.map(category => {
    const positionOverride = positionOverrideObject[category.id],
      sort = getPositionOverrideSort(positionOverride),
      children = guild.channels.cache.filter(
        channel => channel.parentId === category.id
      ),
      childrenBucket = children.map(child => {
        const childPositionOverride = positionOverrideObject[child.id],
          childSort = getPositionOverrideSort(childPositionOverride)

        return {
          id: child.id,
          name: child.name,
          rawPosition: child.rawPosition,
          positionOverride: childPositionOverride,
          customSort: childSort,
        }
      })

    childrenBucket.sort((a, b) => {
      if (a.sort === b.sort) return collator.compare(a.name, b.name)
      else return collator.compare(a.sort, b.sort)
    })

    return {
      id: category.id,
      name: category.name,
      rawPosition: category.rawPosition,
      positionOverride: positionOverride,
      customSort: sort,
      children: childrenBucket,
    }
  })

  // filter to only categories/channels that have position overrides
  if (filterForOverrides)
    categoryBuckets = categoryBuckets.filter(categoryBucket => {
      const categoryHasPositionOverride =
          categoryBucket?.positionOverride !== undefined,
        childrenWithOverrides = categoryBucket.children.filter(
          child => child?.positionOverride !== undefined
        )

      if (categoryHasPositionOverride || childrenWithOverrides.length > 0) {
        categoryBucket.children = childrenWithOverrides

        return true
      }
    })

  //sort buckets by position override and then name
  if (sortByOverrides) {
    for (const categoryBucket of categoryBuckets) {
      categoryBucket.children.sort((a, b) => {
        if (a.customSort === b.customSort)
          return collator.compare(a.name, b.name)
        else return collator.compare(a.customSort, b.customSort)
      })
    }

    categoryBuckets.sort((a, b) => {
      if (a.customSort === b.customSort) return collator.compare(a.name, b.name)
      else return collator.compare(a.customSort, b.customSort)
    })
  } else {
    for (const categoryBucket of categoryBuckets) {
      categoryBucket.children.sort((a, b) =>
        collator.compare(a.rawPosition, b.rawPosition)
      )
    }

    categoryBuckets.sort((a, b) =>
      collator.compare(a.rawPosition, b.rawPosition)
    )
  }

  return categoryBuckets
}

export async function getPositionOverrides(guild) {
  const categoryBuckets = await getCategoryBuckets(guild, true, true),
    positionOverrides = [],
    channelPositionOverrides = []

  categoryBuckets.forEach(categoryBucket => {
    positionOverrides.push({
      group: `categories`,
      values: `<#${categoryBucket.id}>: ${categoryBucket.positionOverride}`,
    })
  })

  categoryBuckets.forEach(categoryBucket => {
    const { children } = categoryBucket

    if (children?.length > 0) {
      children.forEach(child => {
        channelPositionOverrides.push({
          group: `<#${categoryBucket.id}>`,
          values: `<#${child.id}> : ${child.positionOverride}`,
        })
      })
    }
  })

  positionOverrides.push(...channelPositionOverrides)

  return positionOverrides
}
