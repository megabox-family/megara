import { ActionRowBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { guestPicker } from '../utils/general-commands.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const actionRow = new ActionRowBuilder().addComponents(guestPicker)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: ``,
      components: [actionRow],
    },
  })
}
