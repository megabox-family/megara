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

  if (eventRecord.userId !== user.id) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You can only update the seats on events you created 🤔`,
    })

    return
  }

  if (eventRecord.eventType !== `cinema`) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Seats cannot be updated on a non-cinema event 🤔`,
    })

    return
  }

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
