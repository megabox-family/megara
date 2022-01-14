import { getBot } from '../cache-bot.js'
import { announceNewChannel } from '../utils/general.js'
import { requiredRoleDifference } from './roles.js'
import { pushChannelToQueue } from './required-role-queue.js'
import {
  getAdminChannel,
  getFunctionChannels,
  getChannelSorting,
  setAdminChannel,
  setLogChannel,
  setAnnouncementChannel,
  setVerificationChannel,
  getAnnouncementChannel,
  getVerificationChannel,
  getWelcomeChannel,
} from '../repositories/guilds.js'
import {
  createChannelRecord,
  updateChannelRecord,
  deleteChannelRecord,
  getChannelTableByGuild,
  getAlphabeticalCategories,
  getAlphabeticalChannelsByCategory,
  getChannelsGuildById,
} from '../repositories/channels.js'

const setChannelFunction = {
    adminChannel: setAdminChannel,
    logChannel: setLogChannel,
    announcementChannel: setAnnouncementChannel,
    verificationChannel: setVerificationChannel,
  },
  channelVisibilityQueue = [],
  channelSortingQueue = []

async function emptyChannelVisibilityQueue() {
  if (channelVisibilityQueue.length === 0) return

  await setChannelVisibility(channelVisibilityQueue[0])

  channelVisibilityQueue.shift()

  emptyChannelVisibilityQueue()
}

export function pushToChannelVisibilityQueue(channelId) {
  if (!channelVisibilityQueue.includes(channelId))
    channelVisibilityQueue.push(channelId)

  if (channelVisibilityQueue.length === 1) emptyChannelVisibilityQueue()
}

async function emptyChannelSortingQueue() {
  if (channelSortingQueue.length === 0) return

  await sortChannels(channelSortingQueue[0])

  channelSortingQueue.shift()

  emptyChannelSortingQueue()
}

export function pushToChannelSortingQueue(GuildId) {
  if (!channelSortingQueue.includes(GuildId)) channelSortingQueue.push(GuildId)

  if (channelSortingQueue.length === 1) emptyChannelSortingQueue()
}

export function checkType(channel) {
  if (channel.type === `GUILD_CATEGORY`) return `category`
  else if (channel.type === `GUILD_VOICE`) return `voice`

  const roles = channel.guild.roles.cache,
    permissions = channel.permissionOverwrites.cache.map(
      role => roles.get(role.id)?.name
    )

  if (permissions.includes(`!channel type: joinable`)) return `joinable`
  else if (permissions.includes(`!channel type: public`)) return `public`
  else return `private`
}

export function getCommandLevel(channel) {
  const roles = channel.guild.roles.cache,
    channelPermissionOverwrites = channel.permissionOverwrites.cache,
    alphaPermissions = channelPermissionOverwrites.map(
      role => roles.get(role.id)?.name
    )

  if (alphaPermissions.includes(`!command level: admin`)) return `admin`
  else if (alphaPermissions.includes(`!command level: unrestricted`))
    return `unrestricted`
  else if (alphaPermissions.includes(`!command level: restricted`))
    return `restricted`
  else return `prohibited`
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

export async function setChannelVisibility(channelId) {
  const channel = getBot().channels.cache.get(channelId)

  if (!channel) {
    console.log(
      `We tried setting the channel visibility of a channel that no longer exists.`
    )

    return
  }

  const channelType = checkType(channel),
    guild = channel.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id),
    verificationChannelId = await getVerificationChannel(guild.id),
    welcomeChannelId = await getWelcomeChannel(guild.id),
    joinableRoleId = guild.roles.cache.find(
      role => role.name === `!channel type: joinable`
    )?.id,
    publicRoleId = guild.roles.cache.find(
      role => role.name === `!channel type: public`
    )?.id,
    undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    )?.id,
    verifiedRoleId = guild.roles.cache.find(
      role => role.name === `verified`
    )?.id,
    joinableOverwrite = channel.permissionOverwrites.cache.get(joinableRoleId),
    publicOverwrite = channel.permissionOverwrites.cache.get(publicRoleId),
    undergoingVerificationOverwrite = channel.permissionOverwrites.cache.get(
      undergoingVerificationRoleId
    ),
    verifiedOverwrite = channel.permissionOverwrites.cache.get(verifiedRoleId)

  if ([announcementChannelId, welcomeChannelId].includes(channel.id)) {
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (undergoingVerificationOverwrite)
      await undergoingVerificationRoleId.delete()
    if (!publicOverwrite && publicRoleId)
      channel.permissionOverwrites.create(publicRoleId, {})

    if (verifiedOverwrite) {
      const individualPermissions = verifiedOverwrite.allow.serialize()

      if (
        !individualPermissions.VIEW_CHANNEL ||
        individualPermissions.SEND_MESSAGES ||
        individualPermissions.SEND_MESSAGES_IN_THREADS ||
        individualPermissions.CREATE_PUBLIC_THREADS ||
        individualPermissions.CREATE_PRIVATE_THREADS ||
        individualPermissions.ATTACH_FILES ||
        !individualPermissions.READ_MESSAGE_HISTORY
      )
        await verifiedOverwrite.edit({
          VIEW_CHANNEL: true,
          SEND_MESSAGES: false,
          SEND_MESSAGES_IN_THREADS: false,
          CREATE_PUBLIC_THREADS: false,
          CREATE_PRIVATE_THREADS: false,
          ATTACH_FILES: false,
          READ_MESSAGE_HISTORY: true,
        })
    } else
      await channel.permissionOverwrites.create(verifiedRoleId, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: false,
        SEND_MESSAGES_IN_THREADS: false,
        CREATE_PUBLIC_THREADS: false,
        CREATE_PRIVATE_THREADS: false,
        ATTACH_FILES: false,
        READ_MESSAGE_HISTORY: true,
      })
  } else if (channel.id === verificationChannelId) {
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (publicOverwrite) await publicOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()
    if (!undergoingVerificationOverwrite && undergoingVerificationRoleId)
      await channel.permissionOverwrites.create(undergoingVerificationRoleId, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
      })
  } else if (channelType === `joinable`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()
  } else if (channelType === `public`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (!verifiedOverwrite && verifiedRoleId)
      await channel.permissionOverwrites.create(verifiedRoleId, {
        VIEW_CHANNEL: true,
      })
  } else if (channelType === `private`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()
  }
}

export async function sortChannels(guildId) {
  if (!(await getChannelSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
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

  alphabeticalBuckets.forEach(async alphabeticalBucket => {
    const channelsWithPositionOverrides = {},
      orderedChannels = [],
      channelsWithPositiveOverrides = [],
      channelsWithNegativeOverrides = []

    guild.channels.cache.forEach(channel => {
      const positionOverride = getPositionOverride(channel)

      if (positionOverride)
        channelsWithPositionOverrides[channel.id] = positionOverride
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
      } else orderedChannels.push(channel.id)
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

    orderedChannels.forEach((channelId, index) =>
      finalChannelArr.push({ channel: channelId, position: index })
    )
  })

  const currentChannelPosition = finalChannelArr.map(channel => {
    const _channel = guild.channels.cache.get(channel.channel)

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

    await guild.channels
      .setPositions(finalChannelArr)
      .catch(error =>
        console.log(`channel sorting failed, see error below:\n`, error)
      )
  }
}

export async function createChannel(channel, skipAnnouncementAndSort = false) {
  const channelType = checkType(channel),
    commandLevel = getCommandLevel(channel),
    positionOverride = getPositionOverride(channel)

  await createChannelRecord(
    channel,
    channelType,
    commandLevel,
    positionOverride
  )

  // setChannelVisibility(channel, channelType)

  if (skipAnnouncementAndSort) {
    if (channelType === 'joinable') return channel.id
  } else {
    if (!channelSortingQueue.includes(channel.guild.id))
      pushToChannelSortingQueue(channel.guild.id)

    if (channelType === 'joinable') announceNewChannel(channel)
  }
}

export async function modifyChannel(
  oldChannel,
  newChannel,
  skipAnnouncementAndSort = false
) {
  //queue stuffs
  if (oldChannel?.permissionOverwrites) {
    const requiredRole = requiredRoleDifference(
      newChannel.guild,
      oldChannel.permissionOverwrites.cache.map(
        permissionOverwrite => permissionOverwrite.id
      ),
      newChannel.permissionOverwrites.cache.map(
        permissionOverwrite => permissionOverwrite.id
      )
    )

    if (requiredRole)
      pushChannelToQueue({
        guild: newChannel.guild.id,
        role: requiredRole.name,
        channel: newChannel.id,
        permissionOverwrite: oldChannel.permissionOverwrites.cache.get(
          requiredRole.id
        ),
      })
  }

  pushToChannelVisibilityQueue(newChannel.id)

  //other stuffs
  const oldCatergoryId = oldChannel.hasOwnProperty(`categoryId`)
      ? oldChannel.categoryId
      : oldChannel.parentId,
    oldChannelType = oldChannel.hasOwnProperty(`channelType`)
      ? oldChannel.channelType
      : checkType(oldChannel),
    oldCommandLevel = oldChannel.hasOwnProperty(`commandLevel`)
      ? oldChannel.commandLevel
      : getCommandLevel(oldChannel),
    oldPositionOverride = oldChannel.hasOwnProperty(`positionOverride`)
      ? oldChannel.positionOverride
      : getPositionOverride(oldChannel),
    newChannelType = checkType(newChannel),
    newCommandLevel = getCommandLevel(newChannel),
    newPositionOverride = getPositionOverride(newChannel)

  if (
    oldChannel.name !== newChannel.name ||
    oldCatergoryId !== newChannel.parentId ||
    oldChannelType !== newChannelType ||
    oldCommandLevel !== newCommandLevel ||
    oldPositionOverride !== newPositionOverride ||
    oldChannel.position !== newChannel.position ||
    (oldChannel?.rawPosition &&
      oldChannel.rawPosition !== newChannel.rawPosition)
  ) {
    await updateChannelRecord(
      newChannel,
      newChannelType,
      newCommandLevel,
      newPositionOverride
    )
    if (skipAnnouncementAndSort) {
      if (oldChannelType !== `joinable` && newChannelType === `joinable`)
        return newChannel.id
    } else {
      if (
        !channelSortingQueue.includes(newChannel.guild.id) &&
        (oldPositionOverride !== newPositionOverride ||
          oldChannel.position !== newChannel.position ||
          (oldChannel?.rawPosition &&
            oldChannel.rawPosition !== newChannel.rawPosition) ||
          oldChannel.name !== newChannel.name)
      ) {
        pushToChannelSortingQueue(newChannel.guild.id)
      }

      if (oldChannelType !== `joinable` && newChannelType === `joinable`)
        announceNewChannel(newChannel)
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

      if (key === `adminChannel`)
        guild.members.cache.get(guild.ownerId).send(
          `\
            \n You're receiving this message because you are the owner of the ${guild.name} server.
            \nThe channel that was set as the admin channel was deleted at some point 🤔\
            \nTo receive important notifications from me in the server this needs to be set again.
          `
        )
      else {
        const adminChannel = guild.channels.cache.get(
          functionChannels.adminChannel
        )

        if (adminChannel)
          adminChannel.send(
            `\
              \nThe channel that was set as the ${channelName} channel was deleted at some point 🤔\
              \nYou'll need to set this channel function again to gain its functionality.
            `
          )
      }
    }
  })

  await deleteChannelRecord(channelId)

  // if (!skipSort) pushToChannelSortingQueue(guild.id) //I'm not sure why this is needed
}

export async function syncChannels(guild) {
  const channels = guild.channels.cache,
    liveChannelIds = []

  channels.forEach(channel => {
    if (!channel.deleted) liveChannelIds.push(channel.id)
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
    const adminChannelId = await getAdminChannel(guild.id)

    if (!adminChannelId)
      guild.channels.cache.get(adminChannelId).send(
        `Potential oopsie detected. More than five channels were marked for announcement:
          ${channelsToAnnounce.join(', ')}`
      )
  } else {
    channelsToAnnounce.forEach(channelToAnnounce => {
      announceNewChannel(channelToAnnounce)
    })
  }
}
