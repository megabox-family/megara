import { ActionRowBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { checkIfGuestsAreAllowed } from '../repositories/events.js'
import { guestPicker } from '../utils/general-commands.js'
import { getCommandByName } from '../utils/slash-commands.js'
import { logAttendance } from '../button-commands/attend.js'
import { addVenmo } from '../repositories/venmo.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, message, user, fields } = interaction,
    { channelId, messageId } = message.reference

  let venmoTag = fields.getTextInputValue(`venmo-tag`)

  venmoTag = venmoTag.replaceAll(/[\n\r]/g, ``)

  venmoTag = venmoTag.startsWith(`@`) ? venmoTag : `@${venmoTag}`

  await addVenmo(user.id, venmoTag)

  const guestsAllowed = await checkIfGuestsAreAllowed(messageId),
    setVenmoCommand = getCommandByName(`set-venmo`),
    getVenmoCommand = getCommandByName(`get-venmo`),
    deleteVenmoCommand = getCommandByName(`delete-venmo`),
    messageContent =
      `Thank you for supplying your venmo, the organizer will send you a venmo payment request after event details are finalized.` +
      `PS - you can edit, view, and delete your venmo tag by using the` +
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
