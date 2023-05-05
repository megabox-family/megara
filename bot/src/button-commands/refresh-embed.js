import { getPages, generateListMessage } from '../utils/slash-commands.js'
import {
  getColorButtons,
  getChannelButtons,
  getNotificationButtons,
} from '../utils/buttons.js'
import { getListInfo, updateListPageData } from '../repositories/lists.js'
import {
  getformattedChannelPages,
  getPollDetails,
  getPollPages,
} from '../utils/general-commands.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
  })

  const guild = interaction.guild,
    message = interaction.message,
    member = interaction.member,
    listInfo = await getListInfo(message.id)

  if (!listInfo) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Something went wrong retreiving a page in the list, please dismiss this message and create a new list message 😬`,
    })

    return
  }

  const recordsPerPage = listInfo.recordsPerPage,
    group = listInfo.groupBy,
    filters = listInfo.filters

  let pages,
    startingPage = 1

  if (group === `poll`) {
    const channel = interaction.channel,
      pollMessage = await channel.messages.fetch(message.reference?.messageId),
      pollId = pollMessage?.id,
      pollDetails = await getPollDetails(pollId)

    pages = await getPollPages(pollDetails)
    startingPage = pages.length
  } else pages = await getPages(recordsPerPage, group, guild, filters)

  if (pages?.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There was an error refreshing the list, please dismiss this message and create a new list message 😬`,
    })

    return
  }

  let displayPages = pages

  if (
    [`channels-joinable`, `channels-public`, `channels-archived`].includes(
      group
    )
  ) {
    displayPages = getformattedChannelPages(pages)
  }

  const existingEmbed = message.embeds[0],
    messageContent = await generateListMessage(
      displayPages,
      listInfo.title,
      listInfo.description,
      existingEmbed?.color,
      startingPage
    )

  const groupBy = listInfo.groupBy

  let otherButtons

  if (groupBy === `roles-color`)
    otherButtons = getColorButtons(pages[0], member._roles)
  if (groupBy === `roles-notifications`)
    otherButtons = getNotificationButtons(pages[0], member._roles)
  else if (
    [`channels-joinable`, `channels-public`, `channels-archived`].includes(
      groupBy
    )
  )
    otherButtons = getChannelButtons(
      pages[0],
      member.id,
      guild.channels.cache,
      groupBy
    )

  const paginationButtons = messageContent.components[0],
    newComponents = otherButtons
      ? [paginationButtons, ...otherButtons]
      : [paginationButtons]

  messageContent.components = newComponents

  await updateListPageData(message.id, pages)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageContent,
  })
}
