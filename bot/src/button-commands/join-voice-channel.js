import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { getButtonContext } from '../utils/validation.js'
import {
  checkIfMemberIsPermissible,
  getChannelBasename,
} from '../utils/voice.js'

export default async function (interaction) {
  const voiceChannelId = getButtonContext(interaction.customId),
    voiceChannel = getBot().channels.cache.get(voiceChannelId)

  if (!voiceChannel) {
    interaction.reply({
      content: `The channel voice channel you're trying to join no long exists, sorry for the inconvenience 😬`,
      ephemeral: true,
    })

    return
  }

  const guild = voiceChannel.guild,
    member = guild.members.cache.get(interaction.user.id)

  if (!member) {
    interaction.reply({
      content: `You are no longer a member of ${guild.name}, you can't join a channel in a server you aren't a part of 🤔`,
      ephemeral: true,
    })

    return
  }

  const isMemberPermissible = checkIfMemberIsPermissible(voiceChannel, member),
    category = guild.channels.cache.get(voiceChannel.parentId),
    categoryContext = category ? ` in the **${category.name}** category` : ``,
    interactionContent = `
      You've been added to ${voiceChannel}${categoryContext} within the **${guild}** server 👍\
      \nYou can join said voice channel from this message by clicking here → **${voiceChannel}**
    `

  if (isMemberPermissible !== true) {
    const channelBaseName = getChannelBasename(voiceChannel.name),
      parentChannel = guild.channels.cache.find(
        channel => channel.name === channelBaseName
      ),
      otherVoiceChannels = guild.channels.cache.filter(
        _channel =>
          getChannelBasename(_channel.name) === parentChannel?.name &&
          _channel.id !== voiceChannel.id &&
          _channel.type === `GUILD_VOICE`
      ),
      voicePermissons = {}

    if (!isMemberPermissible.viewChannel) voicePermissons.VIEW_CHANNEL = true

    if (!isMemberPermissible.connect) voicePermissons.CONNECT = true

    await parentChannel?.permissionOverwrites.create(member, {
      VIEW_CHANNEL: true,
    })
    await voiceChannel.permissionOverwrites.create(member, voicePermissons)

    interaction.reply({
      content: interactionContent,
      ephemeral: true,
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
    interaction.reply({
      content: interactionContent,
      ephemeral: true,
    })
}
