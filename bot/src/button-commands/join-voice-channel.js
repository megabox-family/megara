import { ChannelType } from 'discord.js'
import { getBot } from '../cache-bot.js'
import { getButtonContext } from '../utils/validation.js'
import { getChannelBasename } from '../utils/voice.js'
import { queueApiCall } from '../api-queue.js'
import { checkIfMemberIsPermissible } from '../utils/channels.js'

export default async function (interaction) {
  const { _guild, user, customId } = interaction,
    isDm = _guild ? false : true,
    messageObject = {}

  if (isDm) {
    await queueApiCall({
      apiCall: `deferUpdate`,
      djsObject: interaction,
    })

    messageObject.components = []
  } else {
    await queueApiCall({
      apiCall: `deferReply`,
      djsObject: interaction,
      parameters: { ephemeral: true },
    })
  }

  const voiceChannelId = getButtonContext(customId),
    voiceChannel = getBot().channels.cache.get(voiceChannelId)

  if (!voiceChannel) {
    messageObject.content = `The channel voice channel you're trying to join no longer exists, sorry for the inconvenience 😬`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  const guild = voiceChannel.guild,
    member = guild.members.cache.get(user.id)

  if (!member) {
    messageObject.content = `You are no longer a member of ${guild.name}, you can't join a channel in a server you aren't a part of 🤔`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  const isMemberPermissible = checkIfMemberIsPermissible(voiceChannel, member)

  messageObject.content = `You've been added to ${voiceChannel} ← click here to jump to it 😊`

  if (isMemberPermissible !== true) {
    const channelBaseName = getChannelBasename(voiceChannel.name),
      otherVoiceChannels = guild.channels.cache.filter(
        _channel =>
          getChannelBasename(_channel.name) === channelBaseName &&
          _channel.id !== voiceChannel.id &&
          _channel.type === ChannelType.GuildVoice
      ),
      voicePermissons = {
        ViewChannel: true,
        Connect: true,
      }

    await queueApiCall({
      apiCall: `create`,
      djsObject: voiceChannel.permissionOverwrites,
      parameters: [member, voicePermissons],
      multipleParameters: true,
    })
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    otherVoiceChannels.forEach(_voiceChannel =>
      queueApiCall({
        apiCall: `create`,
        djsObject: _voiceChannel.permissionOverwrites,
        parameters: [member, voicePermissons],
        multipleParameters: true,
      })
    )
  } else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })
}
