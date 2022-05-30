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
        `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const channelType = await getChannelType(interactionChannel.id)

  if (channelType === `private`) {
    guildMember
      .send(
        `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
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

  if (channelType === `archived`) {
    if (!userOverwrite) {
      interactionChannel.permissionOverwrites.create(guildMember.id, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: false,
      })
    } else if (
      individualPermissions?.VIEW_CHANNEL === false ||
      individualPermissions?.SEND_MESSAGES
    ) {
      interactionChannel.permissionOverwrites.edit(guildMember.id, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: false,
      })
    }
  } else if (channelType === `joinable`) {
    if (!userOverwrite) {
      interactionChannel.permissionOverwrites.create(guildMember.id, {
        VIEW_CHANNEL: true,
      })
    } else if (individualPermissions?.VIEW_CHANNEL === false) {
      interactionChannel.permissionOverwrites.edit(guildMember.id, {
        VIEW_CHANNEL: true,
      })
    }
  } else if (channelType === `public`) {
    if (userOverwrite) {
      userOverwrite.delete()
    }
  }
}
