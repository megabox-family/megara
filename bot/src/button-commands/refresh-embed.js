import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getListInfo, updateListPageData } from '../repositories/lists.js'
import { getPollDetails, getPollPages } from '../utils/general-commands.js'
import { queueApiCall } from '../api-queue.js'
import { getButtonContext } from '../utils/validation.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
  })

  const { guild, message, customId } = interaction,
    referenceMessageId = message.reference?.messageId,
    buttonContextString = getButtonContext(customId),
    buttonContext = buttonContextString ? JSON.parse(buttonContextString) : ``,
    pagesMessageId = referenceMessageId
      ? referenceMessageId
      : buttonContext?.msgId,
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
    groupBy = listInfo.groupBy,
    filters = listInfo.filters

  let pages,
    defaultPage = 1

  if (groupBy === `poll`) {
    const channel = interaction.channel,
      pollMessage = await channel.messages.fetch(message.reference?.messageId),
      pollId = pollMessage?.id,
      pollDetails = await getPollDetails(pollId)

    pages = await getPollPages(pollDetails)
    defaultPage = pages.length
  } else
    pages = await getPages({
      recordsPerPage,
      groupBy,
      guild,
      messageId: pagesMessageId,
      filters,
    })

  if (!(pages?.length > 0)) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `There was an error refreshing the list, please dismiss this message and create a new list message 😬`,
        embeds: [],
        components: [],
      },
    })

    return
  }

  const existingEmbed = message.embeds[0],
    messageContent = await generateListMessage({
      pages,
      title: listInfo.title,
      description: listInfo.description,
      color: existingEmbed?.color,
      defaultPage,
    })

  await updateListPageData(message.id, pages)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageContent,
  })
}
