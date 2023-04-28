import { getVipRemoveMessage } from '../repositories/guilds.js'

export const description = `Shows you the vip remove message for this server.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    vipRemoveMessage = await getVipRemoveMessage(guild.id)

  if (vipRemoveMessage)
    await interaction.editReply({
      content:
        `This is **${interaction.guild}'s** vip remove message:` +
        `\n>>> ${vipRemoveMessage}`,
      ephemeral: true,
    })
  else {
    await interaction.editReply({
      content: `The vip remove message has not been set for this server, please use the \`/set-vip-remove-message\` to do so.`,
    })
  }
}
