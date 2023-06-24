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
} from './channels.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
  setActiveVoiceCategoryId,
} from '../repositories/guilds.js'
import {
  checkIfVoiceChannelIsRelated,
  createVoiceRecord,
  deleteVoiceRecord,
  getDynamicVoiceChildrenRecords,
  getVoiceRecordById,
} from '../repositories/voice.js'
import { queueApiCall } from '../api-queue.js'

export function getChannelBasename(voiceChannelName) {
  if (!voiceChannelName) return

  return voiceChannelName.match(`.+(?=-[0-9]+$)`)?.[0]
}

export function getChannelNumber(voiceChannelName) {
  if (!voiceChannelName) return

  return voiceChannelName.match(`(?<=-)[0-9]+$`)?.[0]
}

export async function deactivateOrDeleteVoiceChannel(voiceChannel) {
  const { guild } = voiceChannel

  voiceChannel = guild.channels.cache.get(voiceChannel.id)

  if (!voiceChannel) return

  const inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id),
    inactiveVoiceCategory = guild.channels.cache.get(inactiveVoiceCategoryId)

  if (!inactiveVoiceCategory) return
  if (voiceChannel.parentId === inactiveVoiceCategory.id) return
  if (voiceChannel.members.size > 0) return

  const voiceRecord = await getVoiceRecordById(voiceChannel.id),
    { temporary, alwaysActive, dynamic, dynamicNumber, parentVoiceChannelId } =
      voiceRecord

  if (temporary === null) return

  if (alwaysActive) {
    if (dynamicNumber === 1) return
  }

  if (temporary) {
    await deleteVoiceRecord(voiceChannel.id)

    await queueApiCall({
      apiCall: `delete`,
      djsObject: voiceChannel,
    })
  } else {
    await queueApiCall({
      apiCall: `setParent`,
      djsObject: voiceChannel,
      parameters: [inactiveVoiceCategoryId, { lockPermissions: true }],
      multipleParameters: true,
    })
  }
}

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
  const { id: guildId, channels } = guild,
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

  const voiceRecord = await getVoiceRecordById(existingChannel?.id)

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
        parameters: [activeVoiceCategoryId, { lockPermissions: true }],
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

  const premiumTier = guild.premiumTier

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
    case `TIER_1`:
      maxBitrate = 128000
      break
    case `TIER_2`:
      maxBitrate = 256000
      break
    case `TIER_3`:
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

  await createVoiceRecord(
    newVoiceChannel.id,
    newVoiceChannel.name,
    dynamic,
    temporary,
    alwaysActive,
    isPrivate,
    guild.id,
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

  if (voiceChannel?.parentId !== activeVoiceCategoryId)
    await queueApiCall({
      apiCall: `setParent`,
      djsObject: voiceChannel,
      parameters: [activeVoiceCategoryId, { lockPermissions: true }],
      multipleParameters: true,
    })
}

export async function createOrActivateDynamicChannel(voiceChannel) {
  if (!voiceChannel || voiceChannel?.members?.size === 0) return

  const voiceRecord = await getVoiceRecordById(voiceChannel.id)

  if (!voiceRecord) return

  const {
    baseName,
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
    newDynamicNumber = dynamicNumber + 1,
    newVoiceChannelName = `${baseName}-${newDynamicNumber}`,
    existingVoiceChannel = guild.channels.cache.find(
      channel => channel.name === newVoiceChannelName
    ),
    existingVoiceIsRelated = await checkIfVoiceChannelIsRelated(
      existingVoiceChannel?.id,
      _parentVoiceChannelId
    )

  if (existingVoiceIsRelated) {
    if (existingVoiceChannel?.parentId !== activeVoiceCategoryId) {
      await queueApiCall({
        apiCall: `setParent`,
        djsObject: existingVoiceChannel,
        parameters: [activeVoiceCategoryId, { lockPermissions: true }],
        multipleParameters: true,
      })
    }

    return
  }

  const permissionOverwrites = voiceChannel.permissionOverwrites.cache,
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

  await createVoiceRecord(
    newVoiceChannel.id,
    newVoiceChannel.name,
    dynamic,
    temporary,
    alwaysActive,
    isPrivate,
    guild.id,
    parentTextChannelId,
    parentThreadId,
    _parentVoiceChannelId
  )
}

export async function deactivateOrDeleteDynamicVoiceChannels(voiceChannel) {
  if (!voiceChannel || voiceChannel?.members?.size > 0) return

  const voiceRecord = await getVoiceRecordById(voiceChannel.id)

  if (!voiceRecord) return

  const { dynamic, voiceChannelParentId } = voiceRecord

  if (!dynamic) return

  const { guild } = voiceChannel,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
    _voiceChannelParentId = voiceChannelParentId
      ? voiceChannelParentId
      : voiceChannel.id,
    parentVoiceChannel =
      _voiceChannelParentId === voiceChannel.id
        ? voiceChannel
        : guild.channels.cache.get(_voiceChannelParentId),
    dynamicVoiceChildrenRecords = await getDynamicVoiceChildrenRecords(
      _voiceChannelParentId
    ),
    dynamicVoiceChannels = dynamicVoiceChildrenRecords.map(
      dynamicVoiceChildrenRecord =>
        guild.channels.cache.get(dynamicVoiceChildrenRecord.id)
    )

  dynamicVoiceChannels.push(parentVoiceChannel)

  const relevantVoiceChannels = dynamicVoiceChannels.filter(
    voiceChannel =>
      voiceChannel.members.size === 0 &&
      voiceChannel.parentId === activeVoiceCategoryId
  )

  for (const relevantVoiceChannel of relevantVoiceChannels) {
    await deactivateOrDeleteVoiceChannel(relevantVoiceChannel)
  }
}

export async function handleVoiceUpdate(oldState, newState) {
  const { guild } = newState,
    channelId = oldState.channelId ? oldState.channelId : newState.channelId,
    voiceChannel = guild.channels.cache.get(channelId)

  await activateVoiceChannel(voiceChannel)
  await deactivateOrDeleteVoiceChannel(voiceChannel)
  await deactivateOrDeleteDynamicVoiceChannels(voiceChannel)
  await createOrActivateDynamicChannel(voiceChannel)
}
