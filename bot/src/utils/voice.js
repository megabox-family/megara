import {
  ChannelType,
  Collection,
  PermissionOverwrites,
  PermissionsBitField,
} from 'discord.js'
import {
  checkIfMemberIsPermissible,
  checkIfChannelIsSuggestedType,
  convertSerialzedPermissionsToPermissionsBitfield,
  sortChannels,
  pushToChannelSortingQueue,
} from './channels.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
  setActiveVoiceCategoryId,
} from '../repositories/guilds.js'
import {
  setCustomVoiceOptions,
  getChannelAndChildrenRecords,
  getChannelRecordById,
  getVoiceChannelParentId,
} from '../repositories/channels.js'
import { queueApiCall } from '../api-queue.js'
import { collator } from './general.js'
import { getVoiceChannelBasename } from './validation.js'

const voiceNumberGate = new Collection()

export async function createVoiceCommandChannel(
  name,
  dynamic,
  temporary,
  disableChat,
  alwaysActive,
  isPrivate,
  guild,
  parentTextChannel,
  parentThread,
  parentVoiceChannel,
  member
) {
  const { id: guildId, channels, premiumTier } = guild,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guildId)

  if (!activeVoiceCategoryId)
    return { message: `active voice category not set` }

  const activeVoiceCategory = channels.cache.get(activeVoiceCategoryId)

  if (!activeVoiceCategory) {
    await setActiveVoiceCategoryId(guildId, null)

    return { message: `active voice category no longer exists` }
  }

  if (dynamic) {
    if (!parentVoiceChannel) name += `-1`
  }

  let existingChannel = channels.cache.find(channel => {
    const isVoiceChannel = checkIfChannelIsSuggestedType(channel, `Voice`)

    if (channel.name === name && isVoiceChannel) {
      return true
    }
  })

  const voiceRecord = await getChannelRecordById(existingChannel?.id)

  existingChannel = voiceRecord ? existingChannel : null

  const memberIsPermissible =
    existingChannel && member
      ? checkIfMemberIsPermissible(existingChannel, member)
      : null

  if (
    (existingChannel && memberIsPermissible === null) ||
    memberIsPermissible
  ) {
    const channelNeedsToBeMoved =
      existingChannel.parentId !== activeVoiceCategoryId

    if (channelNeedsToBeMoved)
      await queueApiCall({
        apiCall: `setParent`,
        djsObject: existingChannel,
        parameters: [activeVoiceCategoryId, { lockPermissions: false }],
        multipleParameters: true,
      })

    const channelInUse = existingChannel.members.size > 0

    return {
      channel: existingChannel,
      preexisting: true,
      voiceRecord: voiceRecord,
      channelMoved: channelNeedsToBeMoved,
      channelInUse: channelInUse,
    }
  } else if (existingChannel && !memberIsPermissible) {
    return { message: `non-permissible` }
  }

  let permissions = new Collection(),
    maxBitrate

  if (parentTextChannel) {
    const parentPermissionOverwrites =
      parentTextChannel.permissionOverwrites.cache

    parentPermissionOverwrites.forEach(permissionOverwrite => {
      const { id, type, allow, deny } = permissionOverwrite,
        allowPermissions = allow.serialize(),
        denyPermissions = deny.serialize(),
        newAllowPermissions = {
          ...allowPermissions,
          Connect: allowPermissions.ViewChannel,
          SendMessages: disableChat ? !disableChat : false,
        },
        newDenyPermissions = {
          ...denyPermissions,
          Connect: denyPermissions.ViewChannel,
          SendMessages: disableChat ? disableChat : false,
        },
        newPermissionOverwrite = new PermissionOverwrites()

      newPermissionOverwrite.id = id
      newPermissionOverwrite.type = type
      newPermissionOverwrite.allow =
        convertSerialzedPermissionsToPermissionsBitfield(newAllowPermissions)
      newPermissionOverwrite.deny =
        convertSerialzedPermissionsToPermissionsBitfield(newDenyPermissions)

      permissions.set(newPermissionOverwrite.id, newPermissionOverwrite)
    })
  } else {
    const everyoneRole = guild.roles.cache.find(
        role => role.name === `@everyone`
      ),
      everyoneOverwrite = new PermissionOverwrites()

    everyoneOverwrite.id = everyoneRole.id
    everyoneOverwrite.type = 0

    if (isPrivate) {
      const guildOverwrite = new PermissionOverwrites()

      // guild (make private)
      guildOverwrite.id = guild.id
      guildOverwrite.type = 0
      guildOverwrite.allow = new PermissionsBitField()
      guildOverwrite.deny = new PermissionsBitField([
        PermissionsBitField.Flags.ViewChannel,
      ])

      permissions.set(guildOverwrite.id, guildOverwrite)

      // everyone overwrite, disable chat
      if (disableChat) {
        everyoneOverwrite.id = everyoneRole.id
        everyoneOverwrite.type = 0
        everyoneOverwrite.allow = new PermissionsBitField()
        everyoneOverwrite.deny = new PermissionsBitField([
          PermissionsBitField.Flags.SendMessages,
        ])

        permissions.set(everyoneOverwrite.id, everyoneOverwrite)
      }

      // add member who created the channel
      if (member) {
        const memberOverwrite = new PermissionOverwrites()

        memberOverwrite.id = member.id
        memberOverwrite.type = 1
        memberOverwrite.allow = new PermissionsBitField([
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
        ])
        memberOverwrite.deny = new PermissionsBitField()

        permissions.set(memberOverwrite.id, memberOverwrite)
      }
    } else {
      everyoneOverwrite.id = everyoneRole.id
      everyoneOverwrite.type = 0
      everyoneOverwrite.allow = new PermissionsBitField()
      everyoneOverwrite.deny = new PermissionsBitField()

      permissions.set(everyoneOverwrite.id, everyoneOverwrite)
    }
  }

  switch (premiumTier) {
    case 1:
      maxBitrate = 128000
      break
    case 2:
      maxBitrate = 256000
      break
    case 3:
      maxBitrate = 384000
      break
    default:
      maxBitrate = 96000
  }

  const newVoiceChannel = await queueApiCall({
    apiCall: `create`,
    djsObject: activeVoiceCategory.children,
    parameters: {
      name: name,
      type: ChannelType.GuildVoice,
      permissionOverwrites: permissions,
      bitrate: maxBitrate,
    },
  })

  await setCustomVoiceOptions(
    newVoiceChannel,
    dynamic,
    1,
    temporary,
    alwaysActive,
    parentTextChannel?.id,
    parentThread?.id,
    parentVoiceChannel?.id
  )

  return { channel: newVoiceChannel }
}

export async function activateVoiceChannel(voiceChannel) {
  if (!voiceChannel) return

  if (voiceChannel.members.size === 0) return

  const { guild } = voiceChannel,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
    activeVoiceCategory = guild.channels.cache.get(activeVoiceCategoryId)

  if (!activeVoiceCategory) return

  if (voiceChannel?.parentId !== activeVoiceCategoryId) {
    await queueApiCall({
      apiCall: `setParent`,
      djsObject: voiceChannel,
      parameters: [activeVoiceCategoryId, { lockPermissions: false }],
      multipleParameters: true,
    })

    return true
  }
}

export async function getFirstAvailableDynamicVoiceChannel(
  guild,
  parentVoiceChannelId
) {
  const dynamicVoiceChannels = await getChannelAndChildrenRecords(
      parentVoiceChannelId
    ),
    firstAvailableDynamicVoiceChannelRecord = dynamicVoiceChannels.find(
      (dynamicVoiceChild, index) => {
        const channel = guild.channels.cache.get(dynamicVoiceChild.id),
          relativeIndex = index + 1

        if (
          channel.members.size === 0 &&
          dynamicVoiceChild.dynamicNumber === relativeIndex
        )
          return true
      }
    ),
    firstAvailableDynamicVoiceChannel = guild.channels.cache.get(
      firstAvailableDynamicVoiceChannelRecord?.id
    )

  return firstAvailableDynamicVoiceChannel
}

export async function getLastAvailableActiveChannel(
  guild,
  parentVoiceChannelId
) {
  const activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id)

  if (!activeVoiceCategoryId) return

  let voiceChannels = await getChannelAndChildrenRecords(parentVoiceChannelId)

  voiceChannels = voiceChannels.filter(dynamicVoiceChannel => {
    const channel = guild.channels.cache.get(dynamicVoiceChannel.id)

    return channel.parentId === activeVoiceCategoryId
  })

  if (!voiceChannels) return

  if (voiceChannels.length === 1) {
    const relevantChannel = guild.channels.cache.get(voiceChannels[0]?.id)

    return relevantChannel
  }

  voiceChannels.sort((a, b) =>
    collator.compare(b.dynamicNumber, a.dynamicNumber)
  )

  const firstAvailableDynamicVoiceChannelRecord = voiceChannels.find(
      dynamicVoiceChild => {
        const channel = guild.channels.cache.get(dynamicVoiceChild.id)

        if (channel.members.size === 0) return true
      }
    ),
    firstAvailableDynamicVoiceChannel = guild.channels.cache.get(
      firstAvailableDynamicVoiceChannelRecord?.id
    )

  return firstAvailableDynamicVoiceChannel
}

export async function getFirstAvailableDynamicNumber(parentVoiceChannelId) {
  const dynamicVoiceChannels = await getChannelAndChildrenRecords(
    parentVoiceChannelId
  )

  if (!dynamicVoiceChannels) return 2

  let firstAvailableDynamicNumber

  for (const [index, dynamicVoiceChild] of dynamicVoiceChannels.entries()) {
    const relativeIndex = index + 1

    if (dynamicVoiceChild.dynamicNumber !== relativeIndex) {
      firstAvailableDynamicNumber = relativeIndex

      break
    }
  }

  return firstAvailableDynamicNumber
    ? firstAvailableDynamicNumber
    : dynamicVoiceChannels.length + 1
}

export async function getCountOfAvailableAndActiveVoiceChannels(
  guild,
  parentVoiceChannelId
) {
  const dynamicVoiceChannels = await getChannelAndChildrenRecords(
      parentVoiceChannelId
    ),
    countObject = {
      activeChannels: 0,
      availableActiveChannels: 0,
    }

  for (const channelRecord of dynamicVoiceChannels) {
    const activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
      channel = guild.channels.cache.get(channelRecord.id)

    if (channel.parentId === activeVoiceCategoryId) countObject.activeChannels++

    if (
      channel.parentId === activeVoiceCategoryId &&
      channel.members.size === 0
    )
      countObject.availableActiveChannels++
  }

  return countObject
}

// export async function getCountOfRelated

export async function createOrActivateDynamicChannel(voiceChannel) {
  if (!voiceChannel || voiceChannel?.members?.size === 0) return

  const voiceRecord = await getChannelRecordById(voiceChannel.id)

  if (!voiceRecord) return

  const {
    dynamic,
    dynamicNumber,
    temporary,
    alwaysActive,
    isPrivate,
    parentTextChannelId,
    parentThreadId,
    parentVoiceChannelId,
  } = voiceRecord

  if (!dynamic) return

  const { guild } = voiceChannel,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
    activeVoiceCategory = guild.channels.cache.get(activeVoiceCategoryId)

  if (!activeVoiceCategory) return

  const _parentVoiceChannelId = parentVoiceChannelId
      ? parentVoiceChannelId
      : voiceChannel.id,
    firstAvailableDynamicVoiceChannel =
      await getFirstAvailableDynamicVoiceChannel(guild, _parentVoiceChannelId)

  if (firstAvailableDynamicVoiceChannel) {
    if (firstAvailableDynamicVoiceChannel?.parentId !== activeVoiceCategoryId) {
      await queueApiCall({
        apiCall: `setParent`,
        djsObject: firstAvailableDynamicVoiceChannel,
        parameters: [activeVoiceCategoryId, { lockPermissions: false }],
        multipleParameters: true,
      })

      return true
    }

    return
  }

  const firstAvailableDynamicNumber = await getFirstAvailableDynamicNumber(
      _parentVoiceChannelId
    ),
    voiceGate = voiceNumberGate.get(_parentVoiceChannelId)

  if (firstAvailableDynamicNumber && firstAvailableDynamicNumber === voiceGate)
    return

  voiceNumberGate.set(_parentVoiceChannelId, firstAvailableDynamicNumber)

  const basename = getVoiceChannelBasename(voiceChannel.name),
    newVoiceChannelName = `${basename}-${firstAvailableDynamicNumber}`,
    permissionOverwrites = voiceChannel.permissionOverwrites.cache,
    newVoiceChannel = await queueApiCall({
      apiCall: `create`,
      djsObject: activeVoiceCategory.children,
      parameters: {
        name: newVoiceChannelName,
        type: ChannelType.GuildVoice,
        permissionOverwrites: permissionOverwrites,
        bitrate: voiceChannel.bitrate,
      },
    })

  await setCustomVoiceOptions(
    newVoiceChannel,
    dynamic,
    firstAvailableDynamicNumber,
    temporary,
    alwaysActive,
    parentTextChannelId,
    parentThreadId,
    _parentVoiceChannelId
  )

  voiceNumberGate.delete(_parentVoiceChannelId)
}

export async function deactivateOrDeleteVoiceChannel(voiceChannel) {
  const { guild } = voiceChannel

  // voiceChannel = guild.channels.cache.get(voiceChannel.id)

  if (!voiceChannel) return

  const inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id),
    inactiveVoiceCategory = guild.channels.cache.get(inactiveVoiceCategoryId)

  if (!inactiveVoiceCategory) return

  const voiceRecord = await getChannelRecordById(voiceChannel.id)

  if (!voiceRecord) return

  const _parentVoiceChannelId = voiceRecord.parentVoiceChannelId
      ? voiceRecord.parentVoiceChannelId
      : voiceChannel.id,
    relevantVoiceChannel = await getLastAvailableActiveChannel(
      guild,
      _parentVoiceChannelId
    )

  if (!relevantVoiceChannel) return

  const relevantVoiceRecord = await getChannelRecordById(
      relevantVoiceChannel?.id
    ),
    { temporary, alwaysActive, dynamicNumber } = relevantVoiceRecord

  if (temporary === null) return

  if (alwaysActive) {
    if (dynamicNumber === 1) return
  }

  const { activeChannels, availableActiveChannels } =
    await getCountOfAvailableAndActiveVoiceChannels(
      guild,
      _parentVoiceChannelId
    )

  if (
    (activeChannels > 1 && availableActiveChannels === 1) ||
    relevantVoiceChannel.members.size > 0
  )
    return

  if (temporary) {
    await queueApiCall({
      apiCall: `delete`,
      djsObject: relevantVoiceChannel,
    })
  } else {
    await queueApiCall({
      apiCall: `setParent`,
      djsObject: relevantVoiceChannel,
      parameters: [inactiveVoiceCategoryId, { lockPermissions: false }],
      multipleParameters: true,
    })

    return true
  }
}

export async function deactivateOrDeleteFirstDynamicVoiceChannel(voiceChannel) {
  const { guild } = voiceChannel,
    channelRecord = await getChannelRecordById(voiceChannel.id)

  if (!channelRecord) return

  const { dynamic, alwaysActive } = channelRecord

  if (!dynamic || alwaysActive) return

  let voiceChannelParentId = await getVoiceChannelParentId(voiceChannel.id)
  voiceChannelParentId = voiceChannelParentId
    ? voiceChannelParentId
    : voiceChannel.id

  const dynamicVoiceChannelRecords = await getChannelAndChildrenRecords(
    voiceChannelParentId
  )

  if (!dynamicVoiceChannelRecords) return

  const activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id)

  if (!activeVoiceCategoryId) return

  const activeChannels = dynamicVoiceChannelRecords.filter(
    dynamicVoiceChannelRecord => {
      const channel = guild.channels.cache.get(dynamicVoiceChannelRecord.id)

      return channel.parentId === activeVoiceCategoryId
    }
  )

  if (activeChannels.length !== 1) return

  const relevantChannelRecord = activeChannels[0],
    relevantVoiceChannel = guild.channels.cache.get(relevantChannelRecord?.id)

  if (relevantVoiceChannel.members.size !== 0) return

  if (relevantChannelRecord.temporary) {
    await queueApiCall({
      apiCall: `delete`,
      djsObject: relevantVoiceChannel,
    })
  } else {
    const inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id)

    await queueApiCall({
      apiCall: `setParent`,
      djsObject: relevantVoiceChannel,
      parameters: [inactiveVoiceCategoryId, { lockPermissions: false }],
      multipleParameters: true,
    })

    return true
  }
}
