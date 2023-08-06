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

  if (eventRecord?.length === 0) {
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

  return

  const attendeeRecords = await getAttendeeRecords(targetId)

  if (attendeeRecords?.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `There are currently no attendees for this event 😔`,
      },
    })

    return
  }

  const fields = []

  let guests = 0,
    totalHeadcount = 0

  attendeeRecords.forEach(attendeeRecord => {
    const { userId, guestCount } = attendeeRecord,
      member = guild.members.cache.get(userId),
      { nickname, user } = member,
      userName = nickname ? nickname : user.username

    fields.push({
      name: userName,
      value:
        `guests - ${guestCount}\n` +
        `headcount - ${guestCount + 1}\n` +
        `venmo - `,
    })

    guests += guestCount
    totalHeadcount += 1 + guestCount
  })

  fields.unshift(
    { name: `total headcount`, value: `${totalHeadcount}` },
    { name: `guests`, value: `${guests}` }
  )

  const embed = new EmbedBuilder()
    .setColor(`#6725BC`)
    .setTitle(`organizer view 👑`)
    .addFields(fields)
    .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `As you requested 🙇‍♀️`,
      embeds: [embed],
    },
  })
}
