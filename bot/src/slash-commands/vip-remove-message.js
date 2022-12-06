import { getVipRemoveMessage } from '../repositories/guilds.js'

export const description = `Shows you the vip remove message for this server.`,
  dmPermission = false,
  defaultMemberPermissions = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    vipRemoveMessage = await getVipRemoveMessage(guild.id)

  if (vipRemoveMessage)
    await interaction.editReply({
      content: `
        This is **${interaction.guild}'s** vip remove message:\
        \n>>> ${vipRemoveMessage}
      `,
      ephemeral: true,
    })
  else {
    await interaction.editReply({
      content: `The vip remove message has not been set for this server, please use the \`/set-vip-remove-message\` to do so.`,
    })
  }
}
