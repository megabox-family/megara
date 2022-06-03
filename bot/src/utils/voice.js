import { MessageActionRow, MessageButton } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { addMemberToChannel, removeMemberFromChannel } from './channels.js'
import { getThreadByName, unarchiveThread } from './threads.js'
import {
  getChannelId,
  getAllTextChannelNames,
  getRoomChannelId,
  getUnverifiedRoomChannelId,
  getChannelType,
} from '../repositories/channels.js'

function getVoiceChannelBasename(voiceChannelName) {
  return voiceChannelName.match(`.+(?=-[0-9]+)`)?.[0]
}

function getVoiceChannelNumber(voiceChannelName) {
  return voiceChannelName.match(`(?!.*-)[0-9]+`)?.[0]
}

export async function checkIfRoomOrTextChannel(voiceChannelName, guildId) {
  if (!voiceChannelName) return

  let voiceChannelType

  if (voiceChannelName.toLowerCase().match(`^room-[0-9]+$`))
    voiceChannelType = `room`
  else if (voiceChannelName.toLowerCase().match(`^unverified-room-[0-9]+$`))
    voiceChannelType = `unverified`

  if (!voiceChannelType) {
    const allTextChannelNames = await getAllTextChannelNames(guildId),
      voiceChannelBasename = getVoiceChannelBasename(voiceChannelName)

    if (allTextChannelNames.includes(voiceChannelBasename))
      voiceChannelType = `text`
  }

  return voiceChannelType
}

async function getOrCreateVoiceThread(textChannel, voiceChannelName) {
  let voiceThread = await getThreadByName(textChannel, voiceChannelName)

  if (!voiceThread)
    voiceThread = await textChannel.threads.create({
      name: voiceChannelName,
      autoArchiveDuration: 10080,
      type: 'GUILD_PUBLIC_THREAD',
      reason: 'Needed thread to match voicechannel',
    })

  await unarchiveThread(voiceThread)

  return voiceThread
}

async function getVoiceThread(voiceChannelName, voiceChannelType, guild) {
  if (!voiceChannelType) return

  let channelId

  if (voiceChannelType === `room`) channelId = await getRoomChannelId(guild.id)
  else if (voiceChannelType === `unverified`)
    channelId = await getUnverifiedRoomChannelId(guild.id)
  else {
    const voiceChannelBasename = getVoiceChannelBasename(voiceChannelName)

    channelId = await getChannelId(voiceChannelBasename, guild.id)
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
    ((channelType === `joinable` && individualPermissions.SEND_MESSAGES) ||
      (channelType === `public` && individualPermissions.VIEW_CHANNEL))
  )
    removeMemberFromChannel(member, channelId)
}

async function addMemberToChannelTemporarily(member, channelId) {
  if (!channelId) return

  const result = await addMemberToChannel(member, channelId, true)

  if (!result || result === `already added`) return

  const guild = member.guild,
    channel = guild.channels.cache.get(channelId),
    buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${channel.id}`)
        .setLabel(`Join ${channel.name}`)
        .setStyle('SUCCESS'),
      new MessageButton()
        .setCustomId(`!leave-channel: ${channel.id}`)
        .setLabel(`Leave ${channel.name}`)
        .setStyle('DANGER')
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

export async function deleteDynamicVoiceChannel(
  voiceChannel,
  voiceChannelType
) {
  if (!voiceChannel) return

  const guild = voiceChannel.guild,
    dynamicVoiceChannels = guild.channels.cache.filter(
      channel =>
        getVoiceChannelBasename(channel.name) ===
          getVoiceChannelBasename(voiceChannel.name) &&
        channel.parentId === voiceChannel.parentId &&
        channel.type === `GUILD_VOICE`
    ),
    emptyChannels = []

  dynamicVoiceChannels.forEach(relevantDynamicVoiceChannel => {
    if (relevantDynamicVoiceChannel.members.size === 0)
      emptyChannels.push(relevantDynamicVoiceChannel)
  })

  if (
    !emptyChannels[0]?.name ||
    (+getVoiceChannelNumber(emptyChannels[0]?.name) !== 1 &&
      emptyChannels.length == 1)
  )
    return

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  emptyChannels.sort((a, b) => collator.compare(a.name, b.name))

  if (
    emptyChannels.length < dynamicVoiceChannels.size &&
    emptyChannels.length > 1
  )
    if (emptyChannels.length > 1) emptyChannels.shift()

  for (const channel of emptyChannels) {
    if (
      channel.name !== `${getVoiceChannelBasename(channel.name)}-1` ||
      voiceChannelType === `text`
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

export async function createVoiceChannel(textChannel, voiceChannelname) {
  const guild = textChannel.guild,
    channelAlreadyExists = guild.channels.cache.find(
      channel =>
        channel.name === voiceChannelname &&
        channel.parentId === textChannel.parentId
    )

  if (channelAlreadyExists) return

  const category = guild.channels.cache.get(textChannel.parentId),
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
        allow: [`VIEW_CHANNEL`],
      },
      {
        id: everyoneRoleId,
        deny: [`VIEW_CHANNEL`],
      }
    )
  else
    textChannel.permissionOverwrites.cache.forEach(overwrite => {
      if (overwrite.id === everyoneRoleId) {
        const individualAllowPermissions = overwrite.allow.serialize(),
          permissionObject = {
            id: overwrite.id,
          }

        if (individualAllowPermissions.VIEW_CHANNEL)
          permissionObject.allow = [`VIEW_CHANNEL`]
        else permissionObject.deny = [`VIEW_CHANNEL`]

        textChannelPermissionArray.push(permissionObject)
      } else
        textChannelPermissionArray.push({
          id: overwrite.id,
          allow: [`VIEW_CHANNEL`],
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

  if (category)
    newVoiceChannel = await category.createChannel(voiceChannelname, {
      type: `GUILD_VOICE`,
      permissionOverwrites: textChannelPermissionArray,
      bitrate: maxBitrate,
    })

  return newVoiceChannel
}

async function createDynamicVoiceChannel(voiceChannel, textChannelId) {
  if (!voiceChannel || !textChannelId) return

  const guild = voiceChannel.guild,
    dynamicVoiceChannels = guild.channels.cache.filter(
      channel =>
        getVoiceChannelBasename(channel.name) ===
          getVoiceChannelBasename(voiceChannel.name) &&
        channel.parentId === voiceChannel.parentId &&
        channel.type === `GUILD_VOICE`
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
        channel.type === `GUILD_VOICE` &&
        getVoiceChannelBasename(channel.name) ===
          getVoiceChannelBasename(voiceChannel.name)
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
      currentChannelNumber = parseInt(
        getVoiceChannelNumber(currentChannelName)
      ),
      lastChannelNumber = parseInt(getVoiceChannelNumber(lastChannelName))

    if (currentChannelNumber - lastChannelNumber > 1) break

    lastChannelName = currentChannelName
  }

  const newChannelBasename = getVoiceChannelBasename(lastChannelName),
    newChannelNumber = parseInt(getVoiceChannelNumber(lastChannelName)) + 1,
    newChannelName = `${newChannelBasename}-${newChannelNumber}`

  createVoiceChannel(textChannel, newChannelName)
}

export async function dynamicRooms(oldState, newState) {
  //prevents muting, deafening, and other in channel state changes from triggering dynamic functionality
  if (oldState.channel?.id === newState.channel?.id) return

  //check voice channel type
  const guild = oldState ? oldState.guild : newState.guild,
    oldVoiceChannelName = oldState.channel?.name,
    newVoiceChannelName = newState.channel?.name,
    oldVoiceChannelType = await checkIfRoomOrTextChannel(
      oldVoiceChannelName,
      guild.id
    ),
    newVoiceChannelType = await checkIfRoomOrTextChannel(
      newVoiceChannelName,
      guild.id
    )

  if (!oldVoiceChannelType && !newVoiceChannelType) return

  //get or create thread
  const oldThread = await getVoiceThread(
      oldVoiceChannelName,
      oldVoiceChannelType,
      guild
    ),
    newThread = await getVoiceThread(
      newVoiceChannelName,
      newVoiceChannelType,
      guild
    ),
    guildMember = guild.members.cache.get(oldState.id)

  await oldThread?.members
    .remove(guildMember.id)
    .catch(error =>
      console.log(`Could not add memeber to thread, see error below\n${error}`)
    )
  await removeMemberFromChannelTemporarily(guildMember, oldThread?.parentId)

  await addMemberToChannelTemporarily(guildMember, newThread?.parentId)
  await newThread?.members
    .add(guildMember.id)
    .catch(error =>
      console.log(`Could not add memeber to thread, see error below\n${error}`)
    )

  //delete or create voice channels
  const oldVoiceChannel = oldState.channel,
    newVoiceChannel = newState.channel,
    textChannelId = newThread?.parentId

  await deleteDynamicVoiceChannel(oldVoiceChannel, oldVoiceChannelType)
  await createDynamicVoiceChannel(newVoiceChannel, textChannelId)
}
