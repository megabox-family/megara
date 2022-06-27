import { getBot } from '../cache-bot.js'
import { getVerificationChannel } from '../repositories/guilds.js'

export default async function (interaction) {
  await interaction.deferReply()

  const guildId = interaction.customId.match(`[0-9]+`)[0],
    guild = getBot().guilds.cache.get(guildId),
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!guildMember) {
    await interaction.editReply(
      `You're not a part of ${guild.name} anymore, you'll need to be re-added before you can deny their rules.`
    )

    return
  }

  const undergoingVerificationRole = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ),
    verifiedRole = guild.roles.cache.find(role => role.name === `verified`),
    userUndergoingVerificationRole = guildMember.roles.cache.get(
      undergoingVerificationRole.id
    ),
    userVerifiedRole = guildMember.roles.cache.get(verifiedRole.id)

  if (userUndergoingVerificationRole)
    await interaction.editReply(
      `You've already accepted ${guild.name}'s rules, to continue please click the verification channel button linked above this message.`
    )
  else if (userVerifiedRole)
    await interaction.editReply(
      `You've already been verified in this ${guild.name}, which means you've already accepted their rules.`
    )
  else {
    await interaction.editReply(
      `As forewarned, you've been removed from the ${guild.name} server for denying their rules.`
    )

    guildMember.kick()
  }
}
