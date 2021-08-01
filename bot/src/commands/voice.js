import { headerCase } from 'change-case'
import {
  setActiveVoiceChannelId,
  channelIsJoinable,
  channelHasActiveVoiceChannel,
} from '../repositories/channels.js'
import { removeVoiceChannelIfEmpty } from '../utils.js'

export default async function (args, { message, guild }) {
  const isJoinableTextChannel = !(await channelIsJoinable(message.channel.id))
  const alreadyHasActiveVoiceChannel = await channelHasActiveVoiceChannel(
    message.channel.id
  )
  if (isJoinableTextChannel || alreadyHasActiveVoiceChannel) return

  const channelName = headerCase(message.channel.name, { delimiter: ' ' })

  const categoryChannelCount = message.channel.parent.children.filter(
    x => x.type === 'text'
  ).size

  const newVoiceChannel = await guild.channels.create(channelName, {
    type: 'voice',
    permissionOverwrites: message.channel.permissionOverwrites.filter(x => {
      const userCanViewChannel = x.allow.toArray().includes('VIEW_CHANNEL')
      return userCanViewChannel && x.type === 'member'
    }),
    parent: message.channel.parentID,
    position: message.channel.position + categoryChannelCount,
  })

  await setActiveVoiceChannelId(message.channel.id, newVoiceChannel.id)

  setTimeout(async () => {
    const voiceChannel = await guild.channels.cache.get(newVoiceChannel.id)
    removeVoiceChannelIfEmpty(voiceChannel)
  }, 30000)
}
