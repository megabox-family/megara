import { queueApiCall } from '../api-queue.js'
import { logAttendance } from './attend.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { message, channel } = interaction,
    { reference } = message,
    { messageId } = reference,
    referanceMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: messageId,
    })

  const context = {
    interaction,
    message: referanceMessage,
    getAttendeesRecord: false,
    guestCount: 0,
    prependMessage: ``,
  }

  await logAttendance(context)
}
