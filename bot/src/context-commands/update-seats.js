import {
  ActionRowBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getEventRecord } from '../repositories/events.js'
import { getCommandByName } from '../utils/slash-commands.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  const { user, targetId } = interaction,
    eventRecord = await getEventRecord(targetId),
    { createdBy, eventType } = eventRecord

  if (!eventRecord) {
    const { id: scheduleEventCommandId } = getCommandByName(`schedule-event`)

    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `This is not a message created by the </schedule-event:${scheduleEventCommandId}> command, or the data for it no longer exists 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  if (createdBy !== user.id) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You can only update the seats on events you created 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  if (eventType !== `cinema`) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `Seats cannot be updated on a non-cinema event 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const modal = new ModalBuilder()
      .setCustomId(`!update-seats: ${targetId}`)
      .setTitle(`update seats`),
    seats = new TextInputBuilder()
      .setCustomId('seats')
      .setLabel('input seats (ie: f5-12, g10-15 & h13-15')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(seats)

  modal.addComponents(firstActionRow)

  await queueApiCall({
    apiCall: `showModal`,
    djsObject: interaction,
    parameters: modal,
  })
}
