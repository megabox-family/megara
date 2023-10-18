import { queueApiCall } from '../api-queue.js'
import { logAttendance } from '../button-commands/attend.js'
import { getAttendeeRecord } from '../repositories/attendees.js'
import { getEventRecord } from '../repositories/events.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, user, values, message } = interaction,
    { channelId, messageId } = message.reference,
    channel = guild.channels.cache.get(channelId),
    eventMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: messageId,
    }),
    spots = values[0],
    guestCount = spots - 1,
    { guestCount: oldGuestCount } = await getAttendeeRecord(user.id, messageId),
    { eventType } = await getEventRecord(messageId),
    spotNomencalture = eventType === `cinema` ? `ticket(s)` : `spot(s)`

  if (guestCount === oldGuestCount) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `You're already marked as needing **${spots} ${spotNomencalture}** for this event 🤔`,
        components: [],
      },
    })

    return
  }

  const context = {
    interaction,
    message: eventMessage,
    getAttendeesRecord: true,
    guestCount,
    prependMessage: ``,
  }

  await logAttendance(context)
}
