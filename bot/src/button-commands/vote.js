import { ActionRowBuilder } from 'discord.js'
import moment from 'moment-timezone'
import {
  checkIfUserHasVoted,
  getVoterChoices,
} from '../repositories/poll-data.js'
import { getPollEndTime } from '../repositories/polls.js'
import { getRetractVoteButton } from '../utils/buttons.js'
import { buildVoterEmbed } from '../utils/embeds.js'
import { getPollSelectPicker } from '../utils/general-commands.js'
import { getNicknameOrUsername } from '../utils/members.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const message = interaction.message,
    endTime = await getPollEndTime(message.id),
    currentTime = moment().unix()

  if (endTime <= currentTime) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `This poll ended on <t:${endTime}:F> 🤔`,
    })

    return
  }

  const user = interaction.user,
    userHasVoted = await checkIfUserHasVoted(message.id, user.id)

  if (userHasVoted) {
    const member = interaction.member,
      name = getNicknameOrUsername(member, user),
      storeChoices = await getVoterChoices(user.id, message.id),
      voterEmbed = buildVoterEmbed(name, storeChoices),
      retractButton = getRetractVoteButton(message.id),
      firstRow = new ActionRowBuilder().addComponents(retractButton)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `You've already voted 🤔`,
        embeds: [voterEmbed],
        components: [firstRow],
      },
    })

    return
  }

  const selectPicker = await getPollSelectPicker(message.id),
    firstRow = new ActionRowBuilder().addComponents(selectPicker)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      components: [firstRow],
    },
  })
}
