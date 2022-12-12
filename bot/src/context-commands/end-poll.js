import { ApplicationCommandType } from 'discord.js'
import { getPollStartedBy } from '../repositories/polls.js'
import { printPollResults } from '../utils/general-commands.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    user = interaction.user,
    channelId = interaction.channelId,
    messageId = interaction.targetId,
    startedBy = await getPollStartedBy(messageId)

  if (!startedBy) {
    await interaction.editReply(
      `Either this isn't a poll message or we're no longer storing its information 🤔`
    )

    return
  }

  if (startedBy !== user.id) {
    await interaction.editReply(
      `You didn't start this poll, you can't end it 😤`
    )

    return
  }

  await printPollResults(channelId, messageId)

  await interaction.editReply(`The poll has been ended per your request 🪄`)
}
