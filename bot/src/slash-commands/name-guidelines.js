import { getNameGuidelines } from '../repositories/guilds.js'

export const description = `Shows you the name guidelines for this sever.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    nameGuidelines = await getNameGuidelines(guild.id)

  if (nameGuidelines)
    await interaction.editReply({
      content: `These are **${interaction.guild}'s** nickname guidelines: \n>>> ${nameGuidelines}`,
      ephemeral: true,
    })
  else {
    await interaction.editReply({
      content: `Sorry, name guidelines have not been set for this server 😔`,
      ephemeral: true,
    })
  }
}
