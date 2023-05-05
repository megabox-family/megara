import { ApplicationCommandType } from 'discord.js'
import {
  removePinnedMessage,
  getPinnedMessageUserId,
} from '../repositories/pinned-messages.js'
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

  if (!message.pinned) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `This message isn't pinned pinned 🤔`,
    })

    return
  }

  const userId = await getPinnedMessageUserId(message.id)

  if (userId !== interaction.user.id) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You didn't pin this message, so you don't have permission to unpin it 🤓`,
    })

    return
  }

  await queueApiCall({
    apiCall: `unpin`,
    djsObject: message,
  })

  await message.unpin()

  await removePinnedMessage(message.id)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `I unpinned the message for you 🙌`,
  })
}
