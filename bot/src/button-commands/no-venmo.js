import { ActionRowBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { addVenmo } from '../repositories/venmo.js'
import { checkIfGuestsAreAllowed } from '../repositories/events.js'
import { getCommandByName } from '../utils/slash-commands.js'
import { logAttendance } from './attend.js'
import { guestPicker } from '../utils/general-commands.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, message, user } = interaction,
    { channelId, messageId } = message.reference

  await addVenmo(user.id, `*doesn't have venmo*`)

  const guestsAllowed = await checkIfGuestsAreAllowed(messageId),
    setVenmoCommand = getCommandByName(`set-venmo`),
    getVenmoCommand = getCommandByName(`get-venmo`),
    deleteVenmoCommand = getCommandByName(`delete-venmo`),
    messageContent =
      `It's *highly* recommended that you sign up for venmo, this makes things much easier for the organizer.` +
      ` Nevertheless, the organizer will reach out to request another form of payment.` +
      ` PS - you can edit, view, and delete your venmo tag by using the` +
      ` </set-venmo:${setVenmoCommand.id}>, </get-venmo:${getVenmoCommand.id}>, & </delete-venmo:${deleteVenmoCommand.id}> commands.\n\n`

  if (guestsAllowed) {
    const actionRow = new ActionRowBuilder().addComponents(guestPicker)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: messageContent,
        components: [actionRow],
      },
    })

    return
  }

  const channel = guild.channels.cache.get(channelId),
    eventMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: messageId,
    }),
    context = {
      interaction,
      message: eventMessage,
      getAttendeesRecord: false,
      guestCount: 0,
      prependMessage: messageContent,
    }

  await logAttendance(context)
}
