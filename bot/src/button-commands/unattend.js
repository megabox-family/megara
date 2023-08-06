import { queueApiCall } from '../api-queue.js'
import { deleteAttendee, getAttendeeRecord } from '../repositories/attendees.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { guild, user, message } = interaction,
    { channelId, messageId } = message.reference

  await deleteAttendee(user.id, messageId)

  const channel = guild.channels.cache.get(channelId),
    eventMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: messageId,
    })

  await queueApiCall({
    apiCall: `remove`,
    djsObject: eventMessage?.thread?.members,
    parameters: user.id,
  })

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `Your attendance information has been removed 😭`,
      components: [],
    },
  })
}
