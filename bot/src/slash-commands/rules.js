import { getRules } from '../repositories/guilds.js'

export const description = `Shows you the rules for this server.`,
  dmPermission = false,
  defaultMemberPermissions = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    rules = await getRules(guild.id)

  if (rules)
    await interaction.editReply({
      content: `
    These are **${interaction.guild}'s** rules:\
    \n>>> ${rules}
  `,
      ephemeral: true,
    })
  else {
    await interaction.editReply({
      content: `Sorry, rules have not been set for this server 😔`,
    })
  }
}
