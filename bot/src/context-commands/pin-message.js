import { ApplicationCommandType } from 'discord.js'
import { addPinnedMessage } from '../repositories/pinned-messages.js'
import { queueApiCall } from '../api-queue.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    channel = guild.channels.cache.get(interaction.channelId),
    message = await channel.messages.fetch(interaction.targetId)

  if (message.pinned) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `This message is already pinned 🤔`,
    })

    return
  }

  await queueApiCall({
    apiCall: `pin`,
    djsObject: message,
  })

  await message.pin()

  await addPinnedMessage(message.id, interaction.user.id)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `I pinned the message for you 📌`,
  })
}
