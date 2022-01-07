import { getBot } from '../cache-bot.js'
import { getVerificationChannel } from '../repositories/guilds.js'

export default async function (interaction) {
  const guildId = interaction.customId.match(`[0-9]+`)[0],
    guild = getBot().guilds.cache.get(guildId),
    guildMember = guild.members.cache.get(interaction.user.id),
    undergoingVerificationRole = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ),
    verifiedRole = guild.roles.cache.find(role => role.name === `verified`),
    userUndergoingVerificationRole = guildMember.roles.cache.get(
      undergoingVerificationRole.id
    ),
    userVerifiedRole = guildMember.roles.cache.get(verifiedRole.id)

  if (userUndergoingVerificationRole)
    guildMember
      .send(
        `You've already accepted ${guild.name}'s rules, to continue please click the verification channel button linked above this message.`
      )
      .catch(error => directMessageError(error, guildMember))
  else if (userVerifiedRole)
    guildMember
      .send(
        `You've already been verified in this ${guild.name}, which means you've already accepted their rules.`
      )
      .catch(error => directMessageError(error, guildMember))
  else {
    await guildMember
      .send(
        `As forewarned, you've been removed from the ${guild.name} server for denying their rules.`
      )
      .catch(error => directMessageError(error, guildMember))

    guildMember.kick()
  }
}
