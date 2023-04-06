import { getVipAssignMessage } from '../repositories/guilds.js'

export const description = `Shows you the vip assign message for this server.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    vipAssignMessage = await getVipAssignMessage(guild.id)

  if (vipAssignMessage)
    await interaction.editReply({
      content:
        `This is **${interaction.guild}'s** vip assign message:` +
        `\n>>> ${vipAssignMessage}`,
      ephemeral: true,
    })
  else {
    await interaction.editReply({
      content: `The vip assign message has not been set for this server, please use the \`/set-vip-assign-message\` to do so.`,
    })
  }
}
