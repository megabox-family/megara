import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import {
  getVerificationChannel,
  getWelcomeChannel,
} from '../repositories/guilds.js'
import { sendVerificationInstructions } from '../utils/general.js'

export default async function (interaction) {
  await interaction.deferReply()

  const guildId = interaction.customId.match(`[0-9]+`)[0],
    guild = getBot().guilds.cache.get(guildId),
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!guildMember) {
    await interaction.editReply(
      `You're not a part of ${guild.name} anymore, you'll need to be re-added before you can accept their rules.`
    )

    return
  }

  const verificationChannelId = await getVerificationChannel(guild.id),
    undergoingVerificationRole = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ),
    verifiedRole = guild.roles.cache.find(role => role.name === `verified`),
    userUndergoingVerificationRole = guildMember.roles.cache.get(
      undergoingVerificationRole.id
    ),
    userVerifiedRole = guildMember.roles.cache.get(verifiedRole.id),
    welcomeChannelId = await getWelcomeChannel(guild.id)

  if (userUndergoingVerificationRole)
    await interaction.editReply(
      `You've already accepted this server's rules, to continue please click the verification channel button linked above this message.`
    )
  else if (userVerifiedRole)
    await interaction.editReply(
      `You've already been verified in ${guild.name}, which means you've already accepted their rules.`
    )
  else if (verificationChannelId && undergoingVerificationRole) {
    guildMember.roles.add(undergoingVerificationRole.id)

    await interaction.editReply(
      `\
        \nThank you for accepting ${guild.name}'s rules 😄\
        
        \nHowever, this server has one more step in their verification process.\ 
        \nTo continue, click here -----> <#${verificationChannelId}> <-----\
      `
    )

    sendVerificationInstructions(guildMember)
  } else if (verifiedRole) {
    guildMember.roles.add(verifiedRole.id)

    if (welcomeChannelId)
      await interaction
        .editReply(
          `\
        \nThank you for accepting ${guild.name}'s rules 😄\
        
        \nYou have now been verified and have full access to the ${guild.name} server! 🤗\
        \nI'd recommend checking out the <#${welcomeChannelId}> channel for more information on what to do next.\
      `
        )
        .catch(error => directMessageError(error, guildMember))
    else
      await interaction
        .editReply(
          `\
        \nThank you for accepting ${guild.name}'s rules 😄\
        
        \nYou have now been verified and have full access to the ${guild.name} server! 🤗\
        \nThis server doesn't have a welcome channel officially set, so if I were you I'd just take a look around 👀\
      `
        )
        .catch(error => directMessageError(error, guildMember))
  } else {
    await interaction
      .editReply(
        `Unfortunately something went wrong, try pressing the desired button again.`
      )
      .catch(error => directMessageError(error, guildMember))
  }
}
