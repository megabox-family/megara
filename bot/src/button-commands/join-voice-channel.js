import { ChannelType } from 'discord.js'
import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { getButtonContext } from '../utils/validation.js'
import {
  checkIfMemberIsPermissible,
  getChannelBasename,
} from '../utils/voice.js'

export default async function (interaction) {
  await interaction.deferReply()

  const voiceChannelId = getButtonContext(interaction.customId),
    voiceChannel = getBot().channels.cache.get(voiceChannelId)

  if (!voiceChannel) {
    await interaction.editReply({
      content: `The channel voice channel you're trying to join no long exists, sorry for the inconvenience 😬`,
    })

    return
  }

  const guild = voiceChannel.guild,
    member = guild.members.cache.get(interaction.user.id)

  if (!member) {
    await interaction.editReply({
      content: `You are no longer a member of ${guild.name}, you can't join a channel in a server you aren't a part of 🤔`,
    })

    return
  }

  const isMemberPermissible = checkIfMemberIsPermissible(voiceChannel, member),
    interactionContent = `You've been added to **${voiceChannel}** ← click here to jump to it 😊`

  if (isMemberPermissible !== true) {
    const channelBaseName = getChannelBasename(voiceChannel.name),
      parentChannel = guild.channels.cache.find(
        channel => channel.name === channelBaseName
      ),
      otherVoiceChannels = guild.channels.cache.filter(
        _channel =>
          getChannelBasename(_channel.name) === parentChannel?.name &&
          _channel.id !== voiceChannel.id &&
          _channel.type === ChannelType.GuildVoice
      ),
      voicePermissons = {}

    if (!isMemberPermissible.viewChannel) voicePermissons.ViewChannel = true

    if (!isMemberPermissible.connect) voicePermissons.Connect = true

    await parentChannel?.permissionOverwrites.create(member, {
      ViewChannel: true,
    })
    await voiceChannel.permissionOverwrites.create(member, voicePermissons)

    await interaction.editReply({
      content: interactionContent,
    })

    for (const [voiceChannelId, voiceChannel] of otherVoiceChannels) {
      await new Promise(resolution => setTimeout(resolution, 5000))

      if (voiceChannel)
        await voiceChannel.permissionOverwrites
          .create(member, voicePermissons)
          .catch(error =>
            console.log(
              `I was unable to add a member to a dynamic voice channel, it was probably deleted as I was adding them:\n${error}`
            )
          )
    }
  } else
    await interaction.editReply({
      content: interactionContent,
    })
}
