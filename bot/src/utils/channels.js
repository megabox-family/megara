import { Permissions } from 'discord.js'
import { getBot } from '../cache-bot.js'
import {
  announceNewChannel,
  getIndividualPermissionSets,
  comparePermissions,
} from '../utils/general.js'
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
  setWelcomeChannel,
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
  getChannelType,
  getRoomChannelId,
  getUnverifiedRoomChannelId,
} from '../repositories/channels.js'

const setChannelFunction = {
    adminChannel: setAdminChannel,
    logChannel: setLogChannel,
    announcementChannel: setAnnouncementChannel,
    verificationChannel: setVerificationChannel,
    welcomeChannel: setWelcomeChannel,
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
  switch (channel.type) {
    case `GUILD_CATEGORY`:
      return `category`
    case `GUILD_VOICE`:
      return `voice`
    case `GUILD_PUBLIC_THREAD`:
      return `public thread`
    case `GUILD_PRIVATE_THREAD`:
      return `private thread`
  }

  const roles = channel.guild.roles.cache,
    permissions = channel.permissionOverwrites.cache.map(
      role => roles.get(role.id)?.name
    )

  if (permissions.includes(`!channel type: archived`)) return `archived`
  else if (permissions.includes(`!channel type: hidden`)) return `hidden`
  else if (permissions.includes(`!channel type: joinable`)) return `joinable`
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
  else if (alphaPermissions.includes(`!command level: cinema`)) return `cinema`
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

function unarchiveUserOverwrites(overwrites) {
  if (!overwrites) return

  let permissionsHaveChanged = false

  overwrites.forEach(overwrite => {
    const denyPermissions = overwrite.deny.serialize()

    if (
      overwrite.type === `member` &&
      (denyPermissions.SEND_MESSAGES ||
        denyPermissions.SEND_MESSAGES_IN_THREADS ||
        denyPermissions.CREATE_PRIVATE_THREADS ||
        denyPermissions.CREATE_PUBLIC_THREADS ||
        denyPermissions?.USE_PRIVATE_THREADS ||
        denyPermissions?.USE_PUBLIC_THREADS)
    ) {
      const newOverwrite = overwrites.get(overwrite.id),
        permissionSets = getIndividualPermissionSets(overwrite)

      permissionSets.allow.delete(`SEND_MESSAGES`)
      permissionSets.allow.delete(`SEND_MESSAGES_IN_THREADS`)
      permissionSets.allow.delete(`CREATE_PRIVATE_THREADS`)
      permissionSets.allow.delete(`CREATE_PUBLIC_THREADS`)
      permissionSets.allow.delete(`USE_PRIVATE_THREADS`)
      permissionSets.allow.delete(`USE_PUBLIC_THREADS`)

      permissionSets.deny.delete(`SEND_MESSAGES`)
      permissionSets.deny.delete(`SEND_MESSAGES_IN_THREADS`)
      permissionSets.deny.delete(`CREATE_PRIVATE_THREADS`)
      permissionSets.deny.delete(`CREATE_PUBLIC_THREADS`)
      permissionSets.deny.delete(`USE_PRIVATE_THREADS`)
      permissionSets.deny.delete(`USE_PUBLIC_THREADS`)

      newOverwrite.allow = new Permissions([...permissionSets.allow])
      newOverwrite.deny = new Permissions([...permissionSets.deny])

      permissionsHaveChanged = true
    }
  })

  return permissionsHaveChanged
}

export async function setChannelVisibility(channelId) {
  const channel = getBot().channels.cache.get(channelId)

  if (!channel) {
    console.log(
      `We tried setting the channel visibility of a channel that no longer exists.`
    )

    return
  }

  const channelType = checkType(channel)

  if ([`public thread`, `private thread`].includes(channelType)) return

  const guild = channel.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id),
    verificationChannelId = await getVerificationChannel(guild.id),
    welcomeChannelId = await getWelcomeChannel(guild.id),
    categoryName = channel.parentId
      ? guild.channels.cache.get(channel.parentId).name
      : ``,
    roles = guild.roles.cache,
    archivedRoleId = roles.find(
      role => role.name === `!channel type: archived`
    )?.id,
    hiddenRoleId = roles.find(
      role => role.name === `!channel type: hidden`
    )?.id,
    joinableRoleId = roles.find(
      role => role.name === `!channel type: joinable`
    )?.id,
    publicRoleId = roles.find(
      role => role.name === `!channel type: public`
    )?.id,
    undergoingVerificationRoleId = roles.find(
      role => role.name === `undergoing verification`
    )?.id,
    verifiedRoleId = roles.find(role => role.name === `verified`)?.id,
    everyoneRoleId = roles.find(role => role.name === `@everyone`).id,
    overwrites = channel.permissionOverwrites.cache,
    archivedOverwrite = archivedRoleId ? overwrites.get(archivedRoleId) : null,
    hiddenOverwrite = hiddenRoleId ? overwrites.get(hiddenRoleId) : null,
    joinableOverwrite = joinableRoleId ? overwrites.get(joinableRoleId) : null,
    publicOverwrite = publicRoleId ? overwrites.get(publicRoleId) : null,
    undergoingVerificationOverwrite = undergoingVerificationRoleId
      ? overwrites.get(undergoingVerificationRoleId)
      : null,
    verifiedOverwrite = verifiedRoleId ? overwrites.get(verifiedRoleId) : null,
    everyoneOverwrite = overwrites.get(everyoneRoleId)

  if ([announcementChannelId, welcomeChannelId].includes(channel.id)) {
    if (hiddenOverwrite) await hiddenOverwrite.delete()
    if (archivedOverwrite) await archivedOverwrite.delete()
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (undergoingVerificationOverwrite)
      await undergoingVerificationRoleId.delete()
    if (!publicOverwrite && publicRoleId)
      channel.permissionOverwrites.create(publicRoleId, {})

    if (verifiedOverwrite) {
      const comparedPermissions = comparePermissions(verifiedOverwrite)

      if (
        !comparedPermissions.VIEW_CHANNEL ||
        comparedPermissions.SEND_MESSAGES ||
        comparedPermissions.SEND_MESSAGES_IN_THREADS ||
        comparedPermissions.CREATE_PUBLIC_THREADS ||
        comparedPermissions.CREATE_PRIVATE_THREADS
      )
        await verifiedOverwrite.edit({
          VIEW_CHANNEL: true,
          SEND_MESSAGES: false,
          SEND_MESSAGES_IN_THREADS: false,
          CREATE_PUBLIC_THREADS: false,
          CREATE_PRIVATE_THREADS: false,
        })
    } else
      await channel.permissionOverwrites.create(verifiedRoleId, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: false,
        SEND_MESSAGES_IN_THREADS: false,
        CREATE_PUBLIC_THREADS: false,
        CREATE_PRIVATE_THREADS: false,
      })
  } else if (channel.id === verificationChannelId) {
    if (hiddenOverwrite) await hiddenOverwrite.delete()
    if (archivedOverwrite) await archivedOverwrite.delete()
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (publicOverwrite) await publicOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()
    if (!undergoingVerificationOverwrite && undergoingVerificationRoleId)
      await channel.permissionOverwrites.create(undergoingVerificationRoleId, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
      })
  } else if (channelType === `hidden`) {
    if (archivedOverwrite) await archivedOverwrite.delete()
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (publicOverwrite) await publicOverwrite.delete()
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()

    if (!verifiedOverwrite) {
      await channel.permissionOverwrites.create(verifiedRoleId, {
        VIEW_CHANNEL: false,
      })
    } else {
      const allowPermissions = verifiedOverwrite.allow.serialize()

      if (allowPermissions.VIEW_CHANNEL) {
        verifiedOverwrite.edit({ VIEW_CHANNEL: false })
      }
    }

    const denyPermissions = everyoneOverwrite.deny.serialize()

    if (denyPermissions.VIEW_CHANNEL) {
      everyoneOverwrite.edit({ VIEW_CHANNEL: true })
    }

    let permissionsHaveChanged = unarchiveUserOverwrites(overwrites)

    if (permissionsHaveChanged)
      await channel.edit({ permissionOverwrites: overwrites })
  } else if (
    categoryName.toUpperCase() === `ARCHIVED` ||
    channelType === `archived`
  ) {
    if (joinableOverwrite) await joinableOverwrite.delete()
    if (publicOverwrite) await publicOverwrite.delete()
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()

    if (!archivedOverwrite && archivedRoleId)
      await channel.permissionOverwrites.create(archivedRoleId, {})

    let permissionsHaveChanged = false

    overwrites.forEach(overwrite => {
      const comparedPermissions = comparePermissions(overwrite)

      if (
        overwrite.type === `member` &&
        (comparedPermissions.SEND_MESSAGES ||
          comparedPermissions.SEND_MESSAGES_IN_THREADS ||
          comparedPermissions.CREATE_PRIVATE_THREADS ||
          comparedPermissions.CREATE_PUBLIC_THREADS)
      ) {
        const newOverwrite = overwrites.get(overwrite.id),
          permissionSets = getIndividualPermissionSets(overwrite)

        permissionSets.allow.delete(`SEND_MESSAGES`)
        permissionSets.allow.delete(`SEND_MESSAGES_IN_THREADS`)
        permissionSets.allow.delete(`CREATE_PRIVATE_THREADS`)
        permissionSets.allow.delete(`CREATE_PUBLIC_THREADS`)

        permissionSets.deny.add(`SEND_MESSAGES`)
        permissionSets.deny.add(`SEND_MESSAGES_IN_THREADS`)
        permissionSets.deny.add(`CREATE_PRIVATE_THREADS`)
        permissionSets.deny.add(`CREATE_PUBLIC_THREADS`)

        newOverwrite.allow = new Permissions([...permissionSets.allow])
        newOverwrite.deny = new Permissions([...permissionSets.deny])

        permissionsHaveChanged = true
      }
    })

    if (permissionsHaveChanged)
      await channel.edit({ permissionOverwrites: overwrites })
  } else if (channelType === `joinable`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()

    let permissionsHaveChanged = unarchiveUserOverwrites(overwrites)

    if (permissionsHaveChanged)
      await channel.edit({ permissionOverwrites: overwrites })
  } else if (channelType === `public`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (!verifiedOverwrite && verifiedRoleId)
      await channel.permissionOverwrites.create(verifiedRoleId, {
        VIEW_CHANNEL: true,
      })

    let permissionsHaveChanged = unarchiveUserOverwrites(overwrites)

    if (permissionsHaveChanged)
      await channel.edit({ permissionOverwrites: overwrites })
  } else if (channelType === `private`) {
    if (undergoingVerificationOverwrite)
      await undergoingVerificationOverwrite.delete()
    if (verifiedOverwrite) await verifiedOverwrite.delete()

    let permissionsHaveChanged = unarchiveUserOverwrites(overwrites)

    if (permissionsHaveChanged)
      await channel.edit({ permissionOverwrites: overwrites })
  }
}

export async function sortChannels(guildId) {
  if (!(await getChannelSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
    channels = guild.channels.cache.filter(
      channel =>
        ![`GUILD_PUBLIC_THREAD`, `GUILD_PRIVATE_THREAD`].includes(channel.type)
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
        if (channel.type === `GUILD_VOICE`)
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

    await guild.channels
      .setPositions(finalChannelArr)
      .catch(error =>
        console.log(`channel sorting failed, see error below:\n`, error)
      )
  }
}

export async function createChannel(channel, skipAnnouncementAndSort = false) {
  const channelType = checkType(channel)

  if ([`public thread`, `private thread`].includes(channelType)) return

  const commandLevel = getCommandLevel(channel),
    positionOverride = getPositionOverride(channel)

  await createChannelRecord(
    channel,
    channelType,
    commandLevel,
    positionOverride
  )

  pushToChannelVisibilityQueue(channel.id)

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
    : checkType(oldChannel)

  if ([`public thread`, `private thread`].includes(oldChannelType)) return

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
      if (oldChannelType !== newChannelType) return newChannel.id
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

      if (oldChannelType !== newChannelType) announceNewChannel(newChannel)
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
    if (
      !channel.deleted &&
      ![`GUILD_PUBLIC_THREAD`, `GUILD_PRIVATE_THREAD`].includes(channel.type)
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

export async function addMemberToChannel(member, channelId, temporary = false) {
  if (!channelId) return

  let result = `already added`

  const guild = member.guild

  const welcomeChannelId = await getWelcomeChannel(guild.id),
    roomChannelId = await getRoomChannelId(guild.id),
    unverifiedRoomId = await getUnverifiedRoomChannelId(guild.id)

  if ([welcomeChannelId, roomChannelId, unverifiedRoomId].includes(channelId))
    return

  const channel = guild.channels.cache.get(channelId),
    channelType = await getChannelType(channel.id),
    userOverwrite = channel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === member.id
    ),
    comparedPermissions = comparePermissions(userOverwrite),
    allowPermissions = userOverwrite?.allow.serialize()

  if (channelType === `archived`) {
    const archivedPermissions = {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: false,
      SEND_MESSAGES_IN_THREADS: false,
      CREATE_PRIVATE_THREADS: false,
      CREATE_PUBLIC_THREADS: false,
    }

    if (!userOverwrite) {
      await channel.permissionOverwrites.create(member.id, archivedPermissions)

      result = `added`
    } else if (
      !comparedPermissions.VIEW_CHANNEL ||
      comparedPermissions.SEND_MESSAGES ||
      comparedPermissions.SEND_MESSAGES_IN_THREADS ||
      comparedPermissions.CREATE_PRIVATE_THREADS ||
      comparedPermissions.CREATE_PUBLIC_THREADS
    ) {
      await channel.permissionOverwrites.edit(member.id, archivedPermissions)

      result = `added`
    }
  } else if (channelType === `joinable`) {
    const joinablePermissions = temporary
      ? { VIEW_CHANNEL: true, SEND_MESSAGES: true }
      : { VIEW_CHANNEL: true, SEND_MESSAGES: null }

    if (!userOverwrite) {
      await channel.permissionOverwrites.create(member.id, joinablePermissions)

      result = `added`
    } else if (
      !comparedPermissions.VIEW_CHANNEL ||
      allowPermissions.SEND_MESSAGES
    ) {
      await channel.permissionOverwrites.edit(member.id, joinablePermissions)

      result = `added`
    }
  } else if (channelType === `public`) {
    if (temporary) {
      if (userOverwrite && comparedPermissions?.VIEW_CHANNEL === false) {
        await channel.permissionOverwrites.edit(member.id, {
          VIEW_CHANNEL: true,
          SEND_MESSAGES: true,
        })

        result = `added`
      }
    } else {
      if (userOverwrite) {
        await userOverwrite.delete()

        result = `added`
      }
    }
  } else {
    result = `not added`
  }

  return result
}

export async function removeMemberFromChannel(member, channelId) {
  if (!channelId) return

  let result = `already removed`

  const guild = member.guild

  const welcomeChannelId = await getWelcomeChannel(guild.id),
    roomChannelId = await getRoomChannelId(guild.id),
    unverifiedRoomId = await getUnverifiedRoomChannelId(guild.id)

  if ([welcomeChannelId, roomChannelId, unverifiedRoomId].includes(channelId))
    return

  const channel = guild.channels.cache.get(channelId),
    channelType = await getChannelType(channel.id),
    userOverwrite = channel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === member.id
    ),
    comparedPermissions = comparePermissions(userOverwrite)

  if ([`archived`, `joinable`].includes(channelType)) {
    if (userOverwrite) {
      userOverwrite.delete()

      result = `removed`
    }
  } else if (channelType === `public`) {
    if (!userOverwrite) {
      channel.permissionOverwrites.create(member.id, {
        VIEW_CHANNEL: false,
      })

      result = `removed`
    } else if (comparedPermissions.VIEW_CHANNEL) {
      channel.permissionOverwrites.edit(member.id, {
        VIEW_CHANNEL: false,
      })

      result = `removed`
    } else {
      result = `not removed`
    }
  }

  return result
}
