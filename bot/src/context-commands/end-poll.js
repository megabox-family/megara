import { ApplicationCommandType } from 'discord.js'
import { getPollStartedBy } from '../repositories/polls.js'
import { printPollResults } from '../utils/general-commands.js'
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
    user = interaction.user,
    channelId = interaction.channelId,
    messageId = interaction.targetId,
    startedBy = await getPollStartedBy(messageId)

  if (!startedBy) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Either this isn't a poll message or we're no longer storing its information 🤔`,
    })

    return
  }

  if (startedBy !== user.id) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You didn't start this poll, you can't end it 😤`,
    })

    return
  }

  await printPollResults(channelId, messageId)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The poll has been ended per your request 🪄`,
  })
}
