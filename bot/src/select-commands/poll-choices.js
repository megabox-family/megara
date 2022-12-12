import { ActionRowBuilder } from 'discord.js'
import moment from 'moment/moment.js'
import {
  checkIfUserHasVoted,
  createPollData,
  getVoterChoices,
} from '../repositories/poll-data.js'
import { getPollEndTime } from '../repositories/polls.js'
import { getRetractVoteButton } from '../utils/buttons.js'
import { buildVoterEmbed } from '../utils/embeds.js'
import { getNicknameOrUsername } from '../utils/members.js'

export default async function (interaction) {
  await interaction.deferUpdate({ ephemeral: true })

  const message = interaction.message,
    pollMessageId = message.reference?.messageId,
    user = interaction.user,
    choices = interaction.values,
    endTime = await getPollEndTime(pollMessageId)

  if (!endTime) {
    await interaction.reply(
      `We're no longer storing the data for this poll, sorry for the inconvenience 😬`
    )

    return
  }

  if (endTime < moment().unix()) {
    await interaction.editReply({
      content: `This poll ended on <t:${endTime}:F> 🤔`,
      components: [],
    })

    return
  }

  const userHasVoted = await checkIfUserHasVoted(pollMessageId, user.id),
    retractButton = getRetractVoteButton(pollMessageId),
    member = interaction.member,
    name = getNicknameOrUsername(member, user),
    storeChoices = await getVoterChoices(user.id, pollMessageId),
    voterEmbed = userHasVoted
      ? buildVoterEmbed(name, storeChoices)
      : buildVoterEmbed(name, choices),
    firstRow = new ActionRowBuilder().addComponents(retractButton)

  if (userHasVoted) {
    const firstRow = new ActionRowBuilder().addComponents(retractButton)

    await interaction.editReply({
      content: `You've already voted 🤔`,
      embeds: [voterEmbed],
      components: [firstRow],
    })

    return
  }

  await createPollData(user.id, pollMessageId, JSON.stringify(choices))

  await interaction.editReply({
    content: `Your vote has been recorded, here's your ballot 📄`,
    embeds: [voterEmbed],
    components: [firstRow],
  })
}
