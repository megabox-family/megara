import { getBot } from '../cache-bot.js'
import { announceNewChannel } from '../utils/general.js'
import { getAdminChannelId } from '../repositories/guilds.js'
import {
  createChannelRecord,
  updateChannelRecord,
  deleteChannel,
  getChannelTableByGuild,
  getAlphabeticalCategories,
  getAlphabeticalChannelsByCategory,
} from '../repositories/channels.js'

export function checkType(channel) {
  if (channel.type === `GUILD_CATEGORY`) return `category`
  else if (channel.type === `GUILD_VOICE`) return `voice`

  const roles = getBot().guilds.cache.get(
      getBot().channels.cache.get(channel.id).guild.id
    ).roles.cache,
    permissions = channel.permissionOverwrites.cache.map(
      role => roles.get(role.id)?.name
    )

  if (permissions.includes(`!channel type: joinable`)) return `joinable`
  else if (permissions.includes(`!channel type: public`)) return `public`
  else return `private`
}

export function getCommandLevel(channel) {
  const roles = getBot().guilds.cache.get(
      getBot().channels.cache.get(channel.id).guild.id
    ).roles.cache,
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
  const roles = getBot().guilds.cache.get(
      getBot().channels.cache.get(channel.id).guild.id
    ).roles.cache,
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

export function setChannelVisibility(channel, channelType) {
  if (['public', 'voice'].includes(channelType))
    channel.permissionOverwrites.edit(
      getBot()
        .guilds.cache.get(channel.guild.id)
        .roles.cache.find(role => role.name === `@everyone`),
      { VIEW_CHANNEL: true }
    )
  else
    channel.permissionOverwrites.edit(
      getBot()
        .guilds.cache.get(channel.guild.id)
        .roles.cache.find(role => role.name === `@everyone`),
      { VIEW_CHANNEL: false }
    )
}

export async function sortChannels(guildId) {
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

  guild.channels.setPositions(finalChannelArr)
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

  setChannelVisibility(channel, channelType)

  if (skipAnnouncementAndSort) {
    if (channelType === 'joinable') return channel.id
  } else {
    sortChannels(channel.guild.id)

    if (channelType === 'joinable') announceNewChannel(channel)
  }
}

export async function modifyChannel(
  oldChannel,
  newChannel,
  skipAnnouncementAndSort = false
) {
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

    setChannelVisibility(newChannel, newChannelType)

    if (skipAnnouncementAndSort) {
      if (oldChannelType !== `joinable` && newChannelType === `joinable`)
        return newChannel.id
    } else {
      if (
        oldPositionOverride !== newPositionOverride ||
        oldChannel.position !== newChannel.position ||
        (oldChannel?.rawPosition &&
          oldChannel.rawPosition !== newChannel.rawPosition)
      )
        sortChannels(newChannel.guild.id)

      if (oldChannelType !== `joinable` && newChannelType === `joinable`)
        announceNewChannel(newChannel)
    }

    if (oldChannelType !== `joinable` && newChannelType === `joinable`) {
      if (skipAnnouncementAndSort) return newChannel.id
      else announceNewChannel(newChannel)
    }
  }
}

export async function syncChannels() {
  getBot().guilds.cache.forEach(async guild => {
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

    if (positionHasChanged) sortChannels(guild.id)

    if (channelsToAnnounce.length >= 5) {
      const adminChannelId = await getAdminChannelId(guild.id)

      if (!adminChannelId) return

      guild.channels.cache.get(adminChannelId).send(
        `Potential oopsie detected. More than five channels were marked for announcement:
          ${channelsToAnnounce.join(', ')}`
      )
    } else {
      channelsToAnnounce.forEach(channelToAnnounce => {
        announceNewChannel(channelToAnnounce)
      })
    }
  })
}
