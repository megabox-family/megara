import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generates a modal that allows you to request a new channel, note that anyone can join this channel.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  const channelRequestModal = new ModalBuilder()
      .setCustomId(`channel-request`)
      .setTitle(`Request a joinable channel`),
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

  await queueApiCall({
    apiCall: `showModal`,
    djsObject: interaction,
    parameters: channelRequestModal,
  })
}
