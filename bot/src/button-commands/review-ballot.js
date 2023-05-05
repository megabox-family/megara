import { ActionRowBuilder } from 'discord.js'
import moment from 'moment/moment.js'
import { getVoterChoices } from '../repositories/poll-data.js'
import { getPollEndTime } from '../repositories/polls.js'
import { getRetractVoteButton } from '../utils/buttons.js'
import { buildVoterEmbed } from '../utils/embeds.js'
import { getNicknameOrUsername } from '../utils/members.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const user = interaction.user,
    message = interaction.message,
    choices = await getVoterChoices(user.id, message.id)

  if (!choices) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You haven't voted in this poll 🤔`,
    })

    return
  }

  const member = interaction.member,
    name = getNicknameOrUsername(member, user),
    voterEmbed = buildVoterEmbed(name, choices),
    endTime = await getPollEndTime(message.id),
    currentTime = moment().unix(),
    retractButton = getRetractVoteButton(message.id),
    firstRow = new ActionRowBuilder().addComponents(retractButton),
    components = endTime > currentTime ? [firstRow] : []

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `Here's your ballot 📄`,
      embeds: [voterEmbed],
      components: components,
    },
  })
}
