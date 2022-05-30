import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { getChannelType } from '../repositories/channels.js'

export default async function (interaction) {
  const interactionChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = interaction.guild,
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!interactionChannel) {
    guildMember
      .send(
        `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const channelType = await getChannelType(interactionChannel.id)

  if (channelType === `private`) {
    guildMember
      .send(
        `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const userOverwrite = interactionChannel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === guildMember.id
    ),
    individualPermissions = userOverwrite
      ? userOverwrite.allow.serialize()
      : null

  if ([`archived`, `joinable`].includes(channelType)) {
    if (userOverwrite) userOverwrite.delete()
  } else if (channelType === `public`) {
    if (!userOverwrite) {
      interactionChannel.permissionOverwrites.create(guildMember.id, {
        VIEW_CHANNEL: false,
      })
    } else if (individualPermissions?.VIEW_CHANNEL) {
      interactionChannel.permissionOverwrites.edit(guildMember.id, {
        VIEW_CHANNEL: false,
      })
    }
  }
}
