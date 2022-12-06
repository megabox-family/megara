import { ApplicationCommandType } from 'discord.js'
import {
  removePinnedMessage,
  getPinnedMessageUserId,
} from '../repositories/pinned-messages.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    channel = guild.channels.cache.get(interaction.channelId),
    message = await channel.messages.fetch(interaction.targetId)

  if (!message.pinned) {
    await interaction.editReply(`This message isn't pinned pinned 🤔`)
  } else {
    const userId = await getPinnedMessageUserId(message.id)

    if (userId !== interaction.user.id) {
      await interaction.editReply(
        `You didn't pin this message, so you don't have permission to unpin it 🤓`
      )

      return
    }

    await message.unpin()

    await removePinnedMessage(message.id)

    await interaction.editReply(`I unpinned the message for you 🙌`)
  }
}
