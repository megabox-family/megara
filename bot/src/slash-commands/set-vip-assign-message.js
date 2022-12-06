import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

export const description = `Generates a modal that allows admins to set the vip assign message for this server.`
export const dmPermission = false,
  defaultMemberPermissions = false

export default async function (interaction) {
  const modal = new ModalBuilder()
      .setCustomId(`set-vip-assign-message`)
      .setTitle(`Set vip assign message`),
    nameGuidelines = new TextInputBuilder()
      .setCustomId('vip-assign-message-input')
      .setLabel('What should the vip assign message be?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(nameGuidelines)

  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
}
