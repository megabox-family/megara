import { ActionRowBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getSpotPicker } from '../utils/general-commands.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const spotPicker = await getSpotPicker({
      messageId: interaction.reference?.messageId,
    }),
    actionRow = new ActionRowBuilder().addComponents(spotPicker)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: ``,
      components: [actionRow],
    },
  })
}
