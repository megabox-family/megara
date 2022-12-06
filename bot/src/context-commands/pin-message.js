import { ApplicationCommandType } from 'discord.js'
import { addPinnedMessage } from '../repositories/pinned-messages.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    channel = guild.channels.cache.get(interaction.channelId),
    message = await channel.messages.fetch(interaction.targetId)

  if (message.pinned) {
    interaction.editReply(`This message is already pinned 🤔`)
  } else {
    await message.pin()

    await addPinnedMessage(message.id, interaction.user.id)

    interaction.editReply(`I pinned the message for you 📌`)
  }
}
