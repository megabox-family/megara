import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { guestPicker } from '../utils/general-commands.js'
import { getAttendeeRecord } from '../repositories/attendees.js'
import { checkIfGuestsAreAllowed } from '../repositories/events.js'

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

  if (attendeeRecord?.length === 0) {
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
    guestsAllowed = await checkIfGuestsAreAllowed(messageId)

  if (guestsAllowed) {
    components.unshift(new ActionRowBuilder().addComponents(guestPicker))
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `Use the components below to modify your attendance 🙇‍♀️`,
      components: components,
    },
  })
}
