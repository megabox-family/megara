import { queueApiCall } from '../api-queue.js'
import { getCustomIdContext } from '../utils/validation.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { channel, customId, fields } = interaction,
    targetId = getCustomIdContext(customId)

  const seats = fields.getTextInputValue(`seats`),
    message = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: targetId,
    }),
    embed = message.embeds[0],
    seatsField = embed.fields.find(field => field.name === `seats`)

  if (seatsField?.value) seatsField.value = seats
  else embed.fields.push({ name: `seats`, value: seats })

  await queueApiCall({
    apiCall: `edit`,
    djsObject: message,
    parameters: { embeds: [embed], files: [] },
  })

  queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The seats on this event have been updated to **${seats}** 🎉`,
  })
}
