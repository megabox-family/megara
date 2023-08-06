import { queueApiCall } from '../api-queue.js'
import { logAttendance } from '../button-commands/attend.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, values, message } = interaction,
    { channelId, messageId } = message.reference,
    channel = guild.channels.cache.get(channelId),
    eventMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: messageId,
    }),
    guestCount = values[0],
    context = {
      interaction,
      message: eventMessage,
      getAttendeesRecord: true,
      guestCount,
      prependMessage: ``,
    }

  await logAttendance(context)
}
