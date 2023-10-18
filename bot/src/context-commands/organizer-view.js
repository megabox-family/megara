import { ApplicationCommandType, EmbedBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getEventRecord } from '../repositories/events.js'
import { getAttendeeRecords } from '../repositories/attendees.js'
import {
  defaultRecordsPerPage,
  generateListMessage,
  getPages,
} from '../utils/slash-commands.js'
import { createList } from '../repositories/lists.js'

export const type = ApplicationCommandType.Message,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, user, targetId } = interaction

  const eventRecord = await getEventRecord(targetId)

  if (!eventRecord) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        'This is not a message spawned by `\\schedule-event``, or the data for it no longer exists 🤔',
    })

    return
  }

  const { createdBy } = eventRecord

  if (user.id !== createdBy) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You didn't create this event, you don't have access to the organizer view 🤔`,
    })

    return
  }

  const recordsPerPage = defaultRecordsPerPage,
    groupBy = `organizer-view`,
    pages = await getPages({
      recordsPerPage,
      groupBy,
      guild,
      messageId: targetId,
    })

  if (!(pages?.length > 0)) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There are currently no attendees for this event 😔`,
    })

    return
  }

  const title = `organizer view 👑`,
    refreshContext = { msgId: targetId },
    messageContents = await generateListMessage({
      pages,
      title,
      refreshContext,
    }),
    replyMessage = await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `As you requested 🙇‍♀️`,
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
