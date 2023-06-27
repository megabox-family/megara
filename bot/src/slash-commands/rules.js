import { queueApiCall } from '../api-queue.js'
import { getRules } from '../repositories/guilds.js'

export const description = `Shows you the rules for this server.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    rules = await getRules(guild.id)

  if (rules)
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `These are **${interaction.guild}'s** rules: \n>>> ${rules}`,
    })
  else {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Sorry, rules have not been set for this server 😔`,
    })
  }
}
