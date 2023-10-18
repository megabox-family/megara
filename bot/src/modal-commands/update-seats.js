import { queueApiCall } from '../api-queue.js'
import { getEventRecord } from '../repositories/events.js'
import { getCommandByName } from '../utils/slash-commands.js'
import { getCustomIdContext } from '../utils/validation.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { user, channel, customId, fields } = interaction,
    targetId = getCustomIdContext(customId),
    eventRecord = await getEventRecord(targetId)

  if (!eventRecord) {
    const { id: scheduleEventCommandId } = getCommandByName(`schedule-event`)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `This is not a message created by the </schedule-event:${scheduleEventCommandId}> command, or the data for it no longer exists 🤔`,
    })

    return
  }

  const seats = fields.getTextInputValue(`seats`),
    message = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: targetId,
    }),
    embed = message.embeds[0]

  for (const field of embed.fields) {
    if (field.name === `seats`) {
      field.value = seats
    }
  }

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
