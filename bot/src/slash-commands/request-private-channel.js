import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

export const description = `Generates a modal that allows you to request a private channel, an admin will follow up.`
export const dmPermission = false,
  defaultMemberPermissions = 0

export default async function (interaction) {
  const channelRequestModal = new ModalBuilder()
      .setCustomId(`private-channel-request`)
      .setTitle(`Request a private channel`),
    channelName = new TextInputBuilder()
      .setCustomId(`channel-name`)
      .setLabel(`What is the requested channel's name?`)
      .setStyle(TextInputStyle.Short)
      .setRequired(),
    additionalInformation = new TextInputBuilder()
      .setCustomId('additional-information')
      .setLabel('What is the topic / why should we create it?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(),
    firstActionRow = new ActionRowBuilder().addComponents(channelName),
    secondActionRow = new ActionRowBuilder().addComponents(
      additionalInformation
    )

  channelRequestModal.addComponents(firstActionRow, secondActionRow)

  await interaction.showModal(channelRequestModal)
}
