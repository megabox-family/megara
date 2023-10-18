import {
  ActionRowBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  const { targetId } = interaction,
    modal = new ModalBuilder()
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
