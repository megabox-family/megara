import { ActionRowBuilder, StringSelectMenuBuilder } from '@discordjs/builders'
import { queueApiCall } from '../api-queue.js'
import {
  checkIfGuestsAreAllowed,
  checkIfVenmoIsRequired,
} from '../repositories/events.js'
import {
  addAttendee,
  getAttendeeRecord,
  updateAttendee,
} from '../repositories/attendees.js'
import { guestPicker } from '../utils/general-commands.js'
import { getVenmoTag } from '../repositories/venmo.js'
import { ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'

export async function logAttendance(context) {
  const {
      interaction,
      message,
      getAttendeesRecord,
      guestCount,
      prependMessage,
    } = context,
    { user } = interaction,
    { id: messageId, thread: _thread } = message,
    attendeeRecord = getAttendeesRecord
      ? await getAttendeeRecord(user.id, messageId)
      : { length: 0 }

  let thread

  if (_thread) thread = _thread
  else if (interaction.channel.type === ChannelType.PublicThread) {
    thread = interaction.channel
  }

  const threadMembers = thread?.members

  if (attendeeRecord?.length === 0) {
    await addAttendee(user.id, messageId, guestCount)

    if (!threadMembers?.cache.has(user.id))
      await queueApiCall({
        apiCall: `add`,
        djsObject: threadMembers,
        parameters: user.id,
      })
  } else await updateAttendee(user.id, messageId, guestCount)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `${prependMessage}Your attendance information has been successfuly recorded 🥰`,
      components: [],
    },
  })
}

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { message, user } = interaction,
    { id: messageId } = message,
    attendeeRecord = await getAttendeeRecord(user.id, messageId)

  if (attendeeRecord?.length > 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `You're already attending this event 🤔` +
        `\n\nTo unattend / modify your attendance click the "modify attendance" button 🤓`,
    })

    return
  }

  const venmoRequired = await checkIfVenmoIsRequired(messageId)

  if (venmoRequired) {
    const venmoTag = await getVenmoTag(user.id)

    if (!venmoTag) {
      const supplyVenmo = new ButtonBuilder()
          .setCustomId(`!supply-venmo:`)
          .setLabel(`supply venmo tag`)
          .setStyle(ButtonStyle.Primary),
        noVenmo = new ButtonBuilder()
          .setCustomId(`!no-venmo:`)
          .setLabel(`I don't have venmo`)
          .setStyle(ButtonStyle.Primary),
        actionRow = new ActionRowBuilder().addComponents(supplyVenmo, noVenmo)

      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: {
          content:
            `The organizer of this event is requesting your venmo tag 💸` +
            `\n\n*We only collect this information once*, and only you and organizers of events you're attending can see it 👊`,
          components: [actionRow],
        },
      })

      return
    }
  }

  const guestsAllowed = await checkIfGuestsAreAllowed(messageId)

  if (guestsAllowed) {
    const actionRow = new ActionRowBuilder().addComponents(guestPicker)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        components: [actionRow],
      },
    })

    return
  }

  const context = {
    interaction,
    message,
    getAttendeesRecord: false,
    guestCount: 0,
    prependMessage: ``,
  }

  await logAttendance(context)
}
