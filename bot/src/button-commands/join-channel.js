import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { addMemberToChannel } from '../utils/channels.js'

export default async function (interaction) {
  const joinChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = joinChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!joinChannel) {
    guildMember
      .send(
        `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const result = await addMemberToChannel(guildMember, joinChannel.id)

  if (result === `not added`)
    guildMember
      .send(
        `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))
  else if (result === `added` && !interaction?.guild)
    guildMember
      .send(`You've been added to **${joinChannel}** 😁`)
      .catch(error => directMessageError(error, guildMember))
  else if (result === `already added` && !interaction?.guild)
    guildMember
      .send(`You already have access **${joinChannel}** 🤔`)
      .catch(error => directMessageError(error, guildMember))
}
