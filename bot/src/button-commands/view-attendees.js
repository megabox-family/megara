import { queueApiCall } from '../api-queue.js'
import { createList } from '../repositories/lists.js'
import {
  defaultRecordsPerPage,
  generateListMessage,
  getPages,
} from '../utils/slash-commands.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { message } = interaction,
    recordsPerPage = defaultRecordsPerPage,
    groupBy = `view-attendees`,
    { id: messageId } = message,
    pages = await getPages({
      recordsPerPage,
      groupBy,
      messageId,
    })

  if (!(pages?.length > 0)) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There are currently no attendees for this event 😔`,
    })

    return
  }

  const title = `attendee info 📃`,
    messageContents = await generateListMessage({ pages, title }),
    replyMessage = await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `Your wish is my command 🪄`,
        ...messageContents,
      },
    })

  await createList({
    id: replyMessage.id,
    title,
    pages,
    recordsPerPage,
    groupBy,
  })
}
