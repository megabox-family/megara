import { queueApiCall } from '../api-queue.js'
import { getNameGuidelines } from '../repositories/guilds.js'

export const description = `Shows you the name guidelines for this sever.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    nameGuidelines = await getNameGuidelines(guild.id)

  if (nameGuidelines)
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `These are **${interaction.guild}'s** nickname guidelines: \n>>> ${nameGuidelines}`,
    })
  else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Sorry, name guidelines have not been set for this server 😔`,
    })
}
