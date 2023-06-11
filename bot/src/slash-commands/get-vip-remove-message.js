import { queueApiCall } from '../api-queue.js'
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
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `This is **${interaction.guild}'s** vip remove message:` +
        `\n>>> ${vipRemoveMessage}`,
    })
  else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The vip remove message has not been set for this server, please use the \`/set-vip-remove-message\` to do so.`,
    })
}
