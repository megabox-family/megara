import { getBot } from '../cache-bot.js'
import { getVerificationChannel } from '../repositories/guilds.js'
import { sendVerificationInstructions } from '../utils/general.js'

export default async function (interaction) {
  const guildId = interaction.customId.match(`[0-9]+`)[0],
    guild = getBot().guilds.cache.get(guildId),
    guildMember = guild.members.cache.get(interaction.user.id),
    verificationChannelId = await getVerificationChannel(guild.id),
    undergoingVerificationRole = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ),
    verifiedRole = guild.roles.cache.find(role => role.name === `verified`),
    userUndergoingVerificationRole = guildMember.roles.cache.get(
      undergoingVerificationRole.id
    ),
    userVerifiedRole = guildMember.roles.cache.get(verifiedRole.id)

  if (userUndergoingVerificationRole)
    guildMember.send(
      `You've already accepted this server's rules, to continue please click the verification channel button linked above this message.`
    )
  else if (userVerifiedRole)
    guildMember.send(
      `You've already been verified in ${guild.name}, which means you've already accepted their rules.`
    )
  else if (verificationChannelId && undergoingVerificationRole) {
    guildMember.roles.add(undergoingVerificationRole.id)

    guildMember.send(
      `\
        \nThank you for accepting ${guild.name}'s rules 😄\
        
        \nHowever, this server has one more step in their verification process.\ 
        \nTo continue, click here -----> <#${verificationChannelId}> <-----\
      `
    )

    sendVerificationInstructions(guildMember)
  } else if (verifiedRole) {
    guildMember.roles.add(verifiedRole.id)

    guildMember.send(
      `\
        \nThank you for accepting ${guild.name}'s rules 😄\
        
        \nYou have now been verified and have full access to the ${guild.name} server! 🤗
      `
    )
  } else {
    guildMember.send(
      `Unfortunately something went wrong, try pressing the desired button again.`
    )
  }
}
