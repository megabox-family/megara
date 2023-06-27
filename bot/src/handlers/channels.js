import { ChannelType } from 'discord.js'
import {
  createChannelRecord,
  deleteChannelRecord,
  setChannelRecordName,
  removeCustomVoiceOptionsByParentId,
} from '../repositories/channels.js'
import {
  announceNewChannel,
  checkIfChannelIsSuggestedType,
  pushToChannelSortingQueue,
} from '../utils/channels.js'

export async function handleChannelCreate(channel) {
  const channelIsThread = checkIfChannelIsSuggestedType(channel, `thread`)

  if (channelIsThread) return

  await createChannelRecord(channel)

  const { guild } = channel,
    announcementTypes = [ChannelType.GuildForum, ChannelType.GuildText]

  if (announcementTypes.includes(channel.type))
    await announceNewChannel(channel)

  pushToChannelSortingQueue(guild.id)
}

export async function handleChannelUpdate(oldChannel, newChannel) {
  const channelIsThread = checkIfChannelIsSuggestedType(oldChannel, `thread`)

  if (channelIsThread) return

  const { guild } = newChannel

  if (
    oldChannel.name !== newChannel.name ||
    oldChannel.parentId !== newChannel.parentId ||
    oldChannel.rawPosition !== newChannel.rawPosition ||
    oldChannel.position !== newChannel.position
  ) {
    pushToChannelSortingQueue(guild.id)
  }

  if (oldChannel.name !== newChannel.name) {
    await setChannelRecordName(newChannel)
  }
}

export async function handleChannelDelete(channel) {
  await removeCustomVoiceOptionsByParentId(channel.id)
  await deleteChannelRecord(channel.id)
}
