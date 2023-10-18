import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getSpotPicker } from '../utils/general-commands.js'
import { getAttendeeRecord } from '../repositories/attendees.js'
import { getEventRecord } from '../repositories/events.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { message, user } = interaction,
    { id: messageId } = message,
    attendeeRecord = await getAttendeeRecord(user.id, messageId)

  if (!attendeeRecord) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `You aren't currently marked as attending this event 🤔` +
        `\n\nTo attend click the "attend" button 🤓`,
    })

    return
  }

  const attendButton = new ButtonBuilder()
      .setCustomId(`!unattend:`)
      .setLabel(`unattend`)
      .setStyle(ButtonStyle.Danger),
    components = [new ActionRowBuilder().addComponents(attendButton)],
    { eventType, allowGuests } = await getEventRecord(messageId),
    guests =
      attendeeRecord?.guestCount === null ? 0 : attendeeRecord?.guestCount,
    spotPicker = await getSpotPicker({ eventType })

  if (allowGuests) {
    components.unshift(new ActionRowBuilder().addComponents(spotPicker))
  }

  const spotNomencalture = eventType === `cinema` ? `ticket(s)` : `spot(s)`,
    spots = 1 + guests

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `You're currently marked as requesting **${spots} ${spotNomencalture}** for this event 😊`,
      components: components,
    },
  })
}
