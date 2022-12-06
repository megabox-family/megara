import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
} from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { addMemberToChannel, removeMemberFromChannel } from './channels.js'
import {
  getThreadByName,
  unarchiveThread,
  addMemberToThread,
} from './threads.js'
import {
  getChannelId,
  getRoomChannelId,
  getUnverifiedRoomChannelId,
  getChannelType,
} from '../repositories/channels.js'

const voiceDeleteCounters = {}

export function getChannelBasename(voiceChannelName) {
  if (!voiceChannelName) return

  return voiceChannelName.match(`.+(?=-[0-9]+$)`)?.[0]
}

export function getChannelNumber(voiceChannelName) {
  if (!voiceChannelName) return

  return voiceChannelName.match(`(?<=-)[0-9]+$`)?.[0]
}

export async function checkIfRoomOrTextChannel(voiceChannel, guild) {
  if (!voiceChannel) return

  const voiceChannelName = voiceChannel?.name

  if (!voiceChannelName) return

  const category = voiceChannel.parentId
      ? guild.channels.cache.get(voiceChannel.parentId)
      : null,
    relevantTextChannels = category
      ? guild.channels.cache.filter(
          channel =>
            channel.parentId === category.id &&
            channel.type === ChannelType.GuildText
        )
      : guild.channels.cache.filter(
          channel => channel.type === ChannelType.GuildText
        )

  let voiceChannelType

  if (voiceChannelName.toLowerCase().match(`^room-[0-9]+$`))
    voiceChannelType = `room`
  else if (voiceChannelName.toLowerCase().match(`^unverified-room-[0-9]+$`))
    voiceChannelType = `unverified`

  const voiceChannelBasename = getChannelBasename(voiceChannelName)

  if (!voiceChannelType) {
    if (
      relevantTextChannels.find(
        channel => channel.name === voiceChannelBasename
      )
    )
      voiceChannelType = `text`
    else {
      let thread

      if (!voiceChannelBasename) {
        for (const [channelId, channel] of relevantTextChannels) {
          thread = channel.threads.cache.find(
            thread => thread.name === voiceChannelName
          )

          if (thread) break
        }
      }

      if (thread) voiceChannelType = `thread`
    }
  }

  return voiceChannelType
}

async function getOrCreateVoiceThread(textChannel, voiceChannelName) {
  let voiceThread = await getThreadByName(textChannel, voiceChannelName)

  if (!voiceThread)
    voiceThread = await textChannel.threads.create({
      name: voiceChannelName,
      autoArchiveDuration: 10080,
      type: ChannelType.PublicThread,
      reason: 'Needed thread to match voicechannel',
    })

  await unarchiveThread(voiceThread)

  return voiceThread
}

async function getVoiceThread(voiceChannel, voiceChannelType, guild) {
  if (!voiceChannel || !voiceChannelType) return

  const voiceChannelName = voiceChannel.name

  let channelId

  if (voiceChannelType === `room`) channelId = await getRoomChannelId(guild.id)
  else if (voiceChannelType === `unverified`)
    channelId = await getUnverifiedRoomChannelId(guild.id)
  else if (voiceChannelType === `text`) {
    const voiceChannelBasename = getChannelBasename(voiceChannelName)

    channelId = await getChannelId(voiceChannelBasename, guild.id)
  } else {
    const category = voiceChannel.parentId
        ? guild.channels.cache.get(voiceChannel.parentId)
        : null,
      relevantTextChannels = category
        ? guild.channels.cache.filter(
            channel =>
              channel.parentId === category.id &&
              channel.type === ChannelType.GuildText
          )
        : guild.channels.cache.filter(
            channel => channel.type === ChannelType.GuildText
          )

    let thread

    for (const [channelId, channel] of relevantTextChannels) {
      thread = channel.threads.cache.find(
        thread => thread.name === voiceChannelName
      )

      if (thread) break
    }

    channelId = thread.parentId
  }

  const channel = guild.channels.cache.get(channelId)

  return await getOrCreateVoiceThread(channel, voiceChannelName)
}

async function removeMemberFromChannelTemporarily(member, channelId) {
  if (!channelId) return

  const guild = member.guild,
    channel = guild.channels.cache.get(channelId),
    channelType = await getChannelType(channelId),
    memberOverwrite = channel.permissionOverwrites.cache.find(
      overwrite => overwrite.id === member.id
    ),
    individualPermissions = memberOverwrite?.allow.serialize()

  if (
    individualPermissions &&
    (channelType === `joinable` || channelType === `public`) &&
    individualPermissions.SendMessages
  )
    removeMemberFromChannel(member, channelId)
}

async function addMemberToChannelTemporarily(member, channelId) {
  if (!channelId) return

  const result = await addMemberToChannel(member, channelId, true)

  if (!result || result === `already added`) return

  const guild = member.guild,
    channel = guild.channels.cache.get(channelId),
    buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!join-channel: ${channel.id}`)
        .setLabel(`Join ${channel.name}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!leave-channel: ${channel.id}`)
        .setLabel(`Leave ${channel.name}`)
        .setStyle(ButtonStyle.Secondary)
    )

  if (result === `added`)
    member
      .send({
        content: `\
        \nYou've been temporarily added to **${channel}** in **${guild}** to provide context to the voice channel you just joined.\
        \nAs soon as you leave this voice channel you will be automatically removed from **${channel}**.\

        \nIf you would like to permenantly join **${channel}** press the join button below. Likewise, you can leave by pressing the leave button below.
      `,
        components: [buttons],
      })
      .catch(error => directMessageError(error, member))
}

export async function queueDelayedVoiceDelete(channel, voiceChannelType) {
  delete voiceDeleteCounters?.[channel.name]

  await new Promise(resolution => setTimeout(resolution, 1250))

  voiceDeleteCounters[channel.name] = 0

  delayedVoiceChannelDelete(channel, voiceChannelType)
}

export async function delayedVoiceChannelDelete(channel, voiceChannelType) {
  await new Promise(resolution => setTimeout(resolution, 1000))

  if (!voiceDeleteCounters.hasOwnProperty(channel.name)) return

  let counter = voiceDeleteCounters?.[channel.name]

  if (counter !== null) counter++

  if (voiceDeleteCounters.hasOwnProperty(channel.name))
    voiceDeleteCounters[channel.name] = counter

  if (voiceDeleteCounters?.[channel.name] === 29) {
    deleteDynamicVoiceChannel(channel, voiceChannelType)
    delete voiceDeleteCounters?.[channel.name]

    return
  }

  delayedVoiceChannelDelete(channel, voiceChannelType)
}

export async function deleteDynamicVoiceChannel(
  voiceChannel,
  voiceChannelType
) {
  if (!voiceChannel) return

  const guild = voiceChannel.guild,
    channels = guild.channels.cache,
    dynamicVoiceChannels =
      voiceChannelType !== `thread`
        ? channels.filter(
            channel =>
              getChannelBasename(channel.name) ===
                getChannelBasename(voiceChannel.name) &&
              channel.parentId === voiceChannel.parentId &&
              channel.type === ChannelType.GuildVoice
          )
        : channels.filter(channel => channel.id === voiceChannel.id),
    emptyChannels = []

  dynamicVoiceChannels.forEach(relevantDynamicVoiceChannel => {
    if (relevantDynamicVoiceChannel.members.size === 0)
      emptyChannels.push(relevantDynamicVoiceChannel)
  })

  if (emptyChannels.length > 1) {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })

    emptyChannels.sort((a, b) => collator.compare(a.name, b.name))
  }

  const _channelNumber = getChannelNumber(emptyChannels[0]?.name),
    channelNumber = _channelNumber ? +_channelNumber : null

  if (
    !emptyChannels[0]?.name ||
    (channelNumber !== null && channelNumber !== 1 && emptyChannels.length == 1)
  )
    return

  if (
    emptyChannels.length < dynamicVoiceChannels.size &&
    emptyChannels.length > 1
  )
    if (emptyChannels.length > 1) emptyChannels.shift()

  for (const channel of emptyChannels) {
    if (
      channel.name !== `${getChannelBasename(channel.name)}-1` ||
      [`thread`, `text`].includes(voiceChannelType)
    )
      await channel
        .delete()
        .catch(error =>
          console.log(
            `Failed to delete dynamic voice channel, see error below:\n${error}`
          )
        )
  }
}

export async function createVoiceChannel(channel, voiceChannelname) {
  const guild = channel.guild,
    channels = guild.channels.cache,
    textChannel =
      channel.type === ChannelType.PublicThread
        ? channels.get(channel.parentId)
        : channel,
    channelAlreadyExists = channels.find(
      channel =>
        channel.name === voiceChannelname &&
        channel.parentId === textChannel.parentId &&
        channel.type === ChannelType.GuildVoice
    )

  if (channelAlreadyExists) return

  const category = channels.get(textChannel.parentId),
    verifiedRoleId = guild.roles.cache.find(
      role => role.name === `verified`
    )?.id,
    everyoneRoleId = guild.roles.cache.find(
      role => role.name === `@everyone`
    ).id,
    textChannelType = await getChannelType(textChannel.id),
    textChannelPermissionArray = []

  if ([`joinable`, `public`].includes(textChannelType))
    textChannelPermissionArray.push(
      {
        id: verifiedRoleId,
        allow: [`ViewChannel`],
      },
      {
        id: everyoneRoleId,
        deny: [`ViewChannel`],
      }
    )
  else
    textChannel.permissionOverwrites.cache.forEach(overwrite => {
      if (overwrite.id === everyoneRoleId) {
        const individualAllowPermissions = overwrite.allow.serialize(),
          permissionObject = {
            id: overwrite.id,
          }

        if (individualAllowPermissions.ViewChannel)
          permissionObject.allow = [`ViewChannel`]
        else permissionObject.deny = [`ViewChannel`]

        textChannelPermissionArray.push(permissionObject)
      } else
        textChannelPermissionArray.push({
          id: overwrite.id,
          allow: [`ViewChannel`],
        })
    })

  const premiumTier = guild.premiumTier

  let newVoiceChannel, maxBitrate

  switch (premiumTier) {
    case `TIER_1`:
      maxBitrate = 128000
    case `TIER_2`:
      maxBitrate = 256000
    case `TIER_3`:
      maxBitrate = 384000
    default:
      maxBitrate = 96000
  }

  if (category) {
    newVoiceChannel = await category.children.create({
      name: voiceChannelname,
      type: ChannelType.GuildVoice,
      permissionOverwrites: textChannelPermissionArray,
      bitrate: maxBitrate,
    })
  }

  return newVoiceChannel
}

async function createDynamicVoiceChannel(voiceChannel, textChannelId) {
  if (!voiceChannel || !textChannelId) return

  const guild = voiceChannel.guild,
    dynamicVoiceChannels = guild.channels.cache.filter(
      channel =>
        getChannelBasename(channel.name) ===
          getChannelBasename(voiceChannel.name) &&
        channel.parentId === voiceChannel.parentId &&
        channel.type === ChannelType.GuildVoice
    ),
    emptyChannels = []

  dynamicVoiceChannels.forEach(relevantDynamicVoiceChannel => {
    if (relevantDynamicVoiceChannel.members.size === 0)
      emptyChannels.push(relevantDynamicVoiceChannel)
  })

  if (emptyChannels.length > 0) return

  const textChannel = guild.channels.cache.get(textChannelId),
    relevantVoiceChannels = guild.channels.cache.filter(
      channel =>
        channel.type === ChannelType.GuildVoice &&
        getChannelBasename(channel.name) ===
          getChannelBasename(voiceChannel.name)
    ),
    collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
    relevantVoiceChannelNames = relevantVoiceChannels
      .map(channel => channel.name)
      .sort(collator.compare)

  let lastChannelName = relevantVoiceChannelNames[0]

  for (let i = 0; i < relevantVoiceChannelNames.length; i++) {
    const currentChannelName = relevantVoiceChannelNames[i],
      currentChannelNumber = parseInt(getChannelNumber(currentChannelName)),
      lastChannelNumber = parseInt(getChannelNumber(lastChannelName))

    if (currentChannelNumber - lastChannelNumber > 1) break

    lastChannelName = currentChannelName
  }

  const newChannelBasename = getChannelBasename(lastChannelName),
    newChannelNumber = parseInt(getChannelNumber(lastChannelName)) + 1,
    newChannelName = `${newChannelBasename}-${newChannelNumber}`

  createVoiceChannel(textChannel, newChannelName)
}

export async function dynamicRooms(oldState, newState) {
  //prevents muting, deafening, and other in channel state changes from triggering dynamic functionality
  if (oldState.channel?.id === newState.channel?.id) return

  //check voice channel type
  const guild = oldState ? oldState.guild : newState.guild,
    oldVoiceChannel = oldState.channel,
    newVoiceChannel = newState.channel,
    oldVoiceChannelType = await checkIfRoomOrTextChannel(
      oldVoiceChannel,
      guild
    ),
    newVoiceChannelType = await checkIfRoomOrTextChannel(newVoiceChannel, guild)

  if (!oldVoiceChannelType && !newVoiceChannelType) return

  //get or create thread
  const oldThread = await getVoiceThread(
      oldVoiceChannel,
      oldVoiceChannelType,
      guild
    ),
    newThread = await getVoiceThread(
      newVoiceChannel,
      newVoiceChannelType,
      guild
    ),
    guildMember = guild.members.cache.get(oldState.id),
    oldIsVoiceThread = getChannelNumber(oldVoiceChannel?.name) ? false : true,
    newIsVoiceThread = getChannelNumber(newVoiceChannel?.name) ? false : true

  if (!oldIsVoiceThread)
    await oldThread?.members
      .remove(guildMember.id)
      .catch(error =>
        console.log(
          `Could not remove member to thread, see error below\n${error}`
        )
      )

  await removeMemberFromChannelTemporarily(guildMember, oldThread?.parentId)

  await addMemberToChannelTemporarily(guildMember, newThread?.parentId)

  if (!newIsVoiceThread) await addMemberToThread(newThread, guildMember)
  else {
    if (!newThread?.members.cache.get(guildMember.id))
      newThread?.members
        .add(guildMember.id)
        .catch(error =>
          console.log(
            `Could not add member to thread, see error below\n${error}`
          )
        )
  }

  //delete or create voice channels
  const textChannelId = newThread?.parentId

  await deleteDynamicVoiceChannel(oldVoiceChannel, oldVoiceChannelType)

  if (!newIsVoiceThread)
    await createDynamicVoiceChannel(newVoiceChannel, textChannelId)
}

export function checkIfMemberIsPermissible(channel, member) {
  const guild = channel.guild,
    channelOverwrites = channel.permissionOverwrites.cache,
    relevantOverwrites = channelOverwrites
      .filter(
        overwrite =>
          member._roles.includes(overwrite.id) ||
          member.id === overwrite.id ||
          guild.roles.cache.get(overwrite.id)?.name === `@everyone`
      )
      .map(overwrite => {
        if (overwrite.id === member.id)
          return {
            position: guild.roles.cache.size + 1,
            overwrite: overwrite,
          }
        else
          return {
            position: guild.roles.cache.get(overwrite.id).position,
            overwrite: overwrite,
            role: guild.roles.cache.get(overwrite.id),
          }
      }),
    collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })

  relevantOverwrites.sort((a, b) => collator.compare(b.position, a.position))

  const memberOverwrite =
    relevantOverwrites[0]?.overwrite.type === OverwriteType.Member
      ? relevantOverwrites[0].overwrite
      : null

  let viewChannel, connect

  if (memberOverwrite) {
    const allowPermissions = memberOverwrite.allow.serialize()

    if (allowPermissions.ViewChannel) viewChannel = true

    if (allowPermissions.Connect) connect = true

    relevantOverwrites.shift()
  }

  for (const relevantOverwrite of relevantOverwrites) {
    const allowPermissions = relevantOverwrite.overwrite.allow.serialize(),
      denyPermissions = relevantOverwrite.overwrite.deny.serialize(),
      rolePermissions = relevantOverwrite.role.permissions.serialize()

    let _viewChannel, _connect

    if (!allowPermissions.ViewChannel && !denyPermissions.ViewChannel) {
      if (rolePermissions.ViewChannel) _viewChannel = true
    } else {
      _viewChannel = allowPermissions.ViewChannel
    }

    if (!allowPermissions.Connect && !denyPermissions.Connect) {
      if (rolePermissions.Connect) _connect = true
    } else {
      _connect = allowPermissions.Connect
    }

    if (viewChannel === undefined) {
      if (_viewChannel == true) viewChannel = true
      else if (_viewChannel == false) viewChannel = false
    }

    if (connect === undefined) {
      if (_connect == true) connect = true
      else if (_connect == false) connect = false
    }

    if (viewChannel !== undefined && connect !== undefined) break
  }

  if (viewChannel && connect) return true
  else return { viewChannel: viewChannel, connect: connect }
}
