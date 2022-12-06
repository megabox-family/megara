import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

export const description = `Generates a modal that allows admins to set the nickname guidelines for this server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  const nameGuidelinesModal = new ModalBuilder()
      .setCustomId(`name-guidelines`)
      .setTitle(`Set name guidelines`),
    nameGuidelines = new TextInputBuilder()
      .setCustomId('name-guidelines-input')
      .setLabel('What should the name guidelines to be?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(nameGuidelines)

  nameGuidelinesModal.addComponents(firstActionRow)

  await interaction.showModal(nameGuidelinesModal)
}
