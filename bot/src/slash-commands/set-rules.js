import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

export const description = `Generates a modal that allows admins to set the rules for this server.`
export const dmPermission = false

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

  await interaction.showModal(rulesModal)
}
