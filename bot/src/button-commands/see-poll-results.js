import { createList } from '../repositories/lists.js'
import { getPollQuestion } from '../repositories/polls.js'
import { getPollPages, getPollDetails } from '../utils/general-commands.js'
import { generateListMessage } from '../utils/slash-commands.js'

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const message = interaction.message,
    customId = interaction.customId.match(`(?!:)[0-9]+`)?.[0],
    pollId = customId ? customId : message.id,
    pollDetails = await getPollDetails(pollId)

  if (pollDetails === `no voter data`) {
    await interaction.editReply(`There is currently no data for this poll 😔`)

    return
  } else if (!pollDetails) {
    await interaction.editReply(
      `I'm no longer storing the data for this poll, sorry for the inconvenience 😬`
    )

    return
  }

  const pages = await getPollPages(pollDetails)

  if (pages?.length === 0) {
    await interaction.editReply(
      `I'm no longer storing the data for this poll, sorry for the inconvenience 😬`
    )

    return
  }

  const title = pollDetails.question,
    {
      totalVoters,
      totalVotes,
      totalChoices,
      requiredChoices,
      rankedChoiceVoting,
    } = pollDetails,
    description =
      `Details: Total Voters = ${totalVoters.toLocaleString()}, Total Votes = ${totalVotes.toLocaleString()}, Ranked choice voting = ${rankedChoiceVoting}\n` +
      `Rules: In this poll voters were able to select up to ${totalChoices} candidate(s) and were required to select at least ${requiredChoices} candidate(s) to vote.`,
    listMessage = await generateListMessage(
      pages,
      title,
      description,
      `#CF2C2C`,
      pages.length
    )

  listMessage.content = `Here's the results of said poll thus far 📃`

  await interaction.editReply(listMessage)

  const replyMessage = await interaction.fetchReply()

  await createList(replyMessage.id, title, description, pages, 0, `poll`)
}
