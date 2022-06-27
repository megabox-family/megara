import { MessageActionRow, Modal, TextInputComponent } from 'discord.js'

export const description = `Generates a modal that allows you to request a new channel, note that anyone can join this channel.`
export const defaultPermission = false

export default async function (interaction) {
  const channelRequestModal = new Modal()
      .setCustomId(`channel-request`)
      .setTitle(`Request a joinable channel`),
    channelName = new TextInputComponent()
      .setCustomId(`channel-name`)
      .setLabel(`What is the requested channel's name?`)
      .setStyle('SHORT')
      .setRequired(),
    additionalInformation = new TextInputComponent()
      .setCustomId('additional-information')
      .setLabel('What is the topic / why should we create it?')
      .setStyle('PARAGRAPH')
      .setRequired(),
    firstActionRow = new MessageActionRow().addComponents(channelName),
    secondActionRow = new MessageActionRow().addComponents(
      additionalInformation
    )

  channelRequestModal.addComponents(firstActionRow, secondActionRow)

  await interaction.showModal(channelRequestModal)
}
