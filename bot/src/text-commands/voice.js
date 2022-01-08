import { headerCase } from 'change-case'
import {
  setActiveVoiceChannelId,
  channelIsJoinable,
  channelHasActiveVoiceChannel,
} from '../repositories/channels.js'
import { removeVoiceChannelIfEmpty } from '../utils/general.js'

export default async function (message, commandSymbol, args) {
  message.reply(
    `Sorry, the coords command is undergoing maintenance and cannot be used.`
  )

  return

  const guild = message.guild,
    isJoinableTextChannel = !(await channelIsJoinable(message.channel.id)),
    alreadyHasActiveVoiceChannel = await channelHasActiveVoiceChannel(
      message.channel.id
    )

  if (isJoinableTextChannel || alreadyHasActiveVoiceChannel) return

  const channelName = headerCase(message.channel.name, { delimiter: ' ' }),
    categoryChannelCount = message.channel.parent.children.filter(
      x => x.type === 'text'
    ).size,
    newVoiceChannel = await guild.channels.create(channelName, {
      type: 'voice',
      permissionOverwrites: message.channel.permissionOverwrites.filter(x => {
        const userCanViewChannel = x.allow.toArray().includes('VIEW_CHANNEL')
        return userCanViewChannel && x.type === 'member'
      }),
      parent: message.channel.parentId,
      position: message.channel.position + categoryChannelCount,
    })

  await setActiveVoiceChannelId(message.channel.id, newVoiceChannel.id)

  setTimeout(async () => {
    const voiceChannel = await guild.channels.cache.get(newVoiceChannel.id)
    removeVoiceChannelIfEmpty(voiceChannel)
  }, 30000)
}
