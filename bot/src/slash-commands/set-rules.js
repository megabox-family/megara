import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generates a modal that allows admins to set the rules for this server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  const rulesModal = new ModalBuilder()
      .setCustomId(`set-rules`)
      .setTitle(`Set rules`),
    nameGuidelines = new TextInputBuilder()
      .setCustomId('rules-input')
      .setLabel('What should the rules be?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(nameGuidelines)

  rulesModal.addComponents(firstActionRow)

  await queueApiCall({
    apiCall: `showModal`,
    djsObject: interaction,
    parameters: rulesModal,
  })
}
