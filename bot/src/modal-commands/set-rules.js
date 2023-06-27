import { queueApiCall } from '../api-queue.js'
import { setRules, getRules } from '../repositories/guilds.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    fields = interaction.fields,
    newRules = fields.getTextInputValue('rules-input')

  await setRules(guild.id, newRules)

  const rules = await getRules(guild.id)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `You've set **${guild}'s** rules to the below: \n>>> ${rules}`,
  })
}
