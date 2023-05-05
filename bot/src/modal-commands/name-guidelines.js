import { queueApiCall } from '../api-queue.js'
import { setNameGuidelines, getNameGuidelines } from '../repositories/guilds.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    fields = interaction.fields,
    newNameGuidelines = fields.getTextInputValue('name-guidelines-input')

  await setNameGuidelines(guild.id, newNameGuidelines)

  const nameGuidelines = await getNameGuidelines(guild.id)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters:
      `You've set **${guild}'s** name guidelines to the below:` +
      `\n>>> ${nameGuidelines}`,
  })
}
