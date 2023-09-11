import { queueApiCall } from '../api-queue.js'
import { checkIfChannelIsSuggestedType } from '../utils/channels.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, channel, user } = interaction

  if (!checkIfChannelIsSuggestedType(channel, `thread`)) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `Something seems off... this button should only exist within a thread 🤔` +
        `\n\nContact and admin for fruther assistance.`,
    })

    return
  }

  await queueApiCall({
    apiCall: `remove`,
    djsObject: channel.members,
    parameters: user.id,
  })

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `You've been removed from ${channel} 👍`,
      components: [],
    },
  })
}
