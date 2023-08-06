import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  const modal = new ModalBuilder()
      .setCustomId(`request-venmo`)
      .setTitle(`venmo tag request`),
    nameGuidelines = new TextInputBuilder()
      .setCustomId('venmo-tag')
      .setLabel('input your venmo tag (ie: chloe18, @chloe18)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(nameGuidelines)

  modal.addComponents(firstActionRow)

  await queueApiCall({
    apiCall: `showModal`,
    djsObject: interaction,
    parameters: modal,
  })
}
