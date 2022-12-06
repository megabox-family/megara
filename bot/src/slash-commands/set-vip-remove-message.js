import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

export const description = `Generates a modal that allows admins to set the vip remove message for this server.`
export const dmPermission = false,
  defaultMemberPermissions = 0

export default async function (interaction) {
  const modal = new ModalBuilder()
      .setCustomId(`set-vip-remove-message`)
      .setTitle(`Set vip remove message`),
    nameGuidelines = new TextInputBuilder()
      .setCustomId('vip-remove-message-input')
      .setLabel('What should the vip remove message be?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(nameGuidelines)

  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
}
