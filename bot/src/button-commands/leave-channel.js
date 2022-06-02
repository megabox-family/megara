import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { removeMemberFromChannel } from '../utils/channels.js'

export default async function (interaction) {
  const leaveChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = leaveChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!leaveChannel) {
    guildMember
      .send(
        `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const result = await removeMemberFromChannel(guildMember, leaveChannel.id)

  if (result === `not removed`)
    guildMember
      .send(
        `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))
  else if (result === `removed` && !interaction?.guild)
    guildMember
      .send(`You've been removed from **${leaveChannel}** 👋`)
      .catch(error => directMessageError(error, guildMember))
  else if (result === `already removed` && !interaction?.guild)
    guildMember
      .send(`You aren't in **${leaveChannel}** 🤔`)
      .catch(error => directMessageError(error, guildMember))
}
