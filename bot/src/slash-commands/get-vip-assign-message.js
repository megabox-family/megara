import { queueApiCall } from '../api-queue.js'
import { getVipAssignMessage } from '../repositories/guilds.js'

export const description = `Shows you the vip assign message for this server.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    vipAssignMessage = await getVipAssignMessage(guild.id)

  if (vipAssignMessage)
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `This is **${interaction.guild}'s** vip assign message:` +
        `\n>>> ${vipAssignMessage}`,
    })
  else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The vip assign message has not been set for this server, please use the \`/set-vip-assign-message\` to do so.`,
    })
}
