import { ActionRowBuilder, StringSelectMenuBuilder } from '@discordjs/builders'
import { queueApiCall } from '../api-queue.js'
import {
  checkIfGuestsAreAllowed,
  checkIfVenmoIsRequired,
  getEventRecord,
} from '../repositories/events.js'
import {
  addAttendee,
  getAttendeeRecord,
  updateAttendee,
} from '../repositories/attendees.js'
import { getVenmoTag } from '../repositories/venmo.js'
import { ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'

export async function getMessageLinkContext(guild, channel, messageId) {
  const eventRecord = await getEventRecord(messageId),
    { createdBy, eventType } = eventRecord,
    spotNomencalture = eventType === `cinema` ? `ticket(s)` : `spot(s)`,
    organizer = guild.members.cache.get(createdBy),
    channelTypeIsForum = channel.type === ChannelType.GuildForum,
    messageLink = channelTypeIsForum
      ? `https://discord.com/channels/${guild.id}/${messageId}`
      : `https://discord.com/channels/${guild.id}/${channel.id}/${messageId}`

  return { organizer, spotNomencalture, messageLink }
}

export async function logAttendance(context) {
  const {
      interaction,
      message,
      getAttendeesRecord,
      guestCount,
      prependMessage,
    } = context,
    { guild, user, channel } = interaction,
    { id: messageId, thread: _thread } = message,
    attendeeRecord = getAttendeesRecord
      ? await getAttendeeRecord(user.id, messageId)
      : null

  let thread

  if (_thread) thread = _thread
  else if (channel.type === ChannelType.PublicThread) {
    thread = channel
  }

  const threadMembers = thread?.members,
    newSpotCount = 1 + guestCount

  if (!attendeeRecord) {
    await addAttendee(user.id, messageId, guestCount)

    const { value: seats } = message.embeds[0].fields.find(
      field => field.name === `seats`
    )

    if (seats && seats !== `tbd`) {
      const { organizer, spotNomencalture, messageLink } =
        await getMessageLinkContext(guild, channel, messageId)

      if (organizer.id !== user.id)
        await queueApiCall({
          apiCall: `send`,
          djsObject: organizer,
          parameters: {
            content: `*After you added seats*, ${user} has requested **${newSpotCount} ${spotNomencalture}** for an event you organized → ${messageLink}`,
          },
        })
    }

    if (!threadMembers?.cache.has(user.id))
      await queueApiCall({
        apiCall: `add`,
        djsObject: threadMembers,
        parameters: user.id,
      })
  } else {
    await updateAttendee(user.id, messageId, guestCount)

    const { guestCount: oldGuestCount } = attendeeRecord,
      oldSpotCount = 1 + oldGuestCount,
      { organizer, spotNomencalture, messageLink } =
        await getMessageLinkContext(guild, channel, messageId)

    if (organizer.id !== user.id)
      await queueApiCall({
        apiCall: `send`,
        djsObject: organizer,
        parameters: {
          content:
            `${user} changed the number of ${spotNomencalture} they requested **(${oldSpotCount} → ${newSpotCount})** ` +
            `for an event you organized → ${messageLink}`,
        },
      })
  }

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

  if (attendeeRecord) {
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
    const myselfButton = new ButtonBuilder()
        .setCustomId(`!myself:`)
        .setLabel(`just myself`)
        .setStyle(ButtonStyle.Primary),
      guestButton = new ButtonBuilder()
        .setCustomId(`!myself-and-guests:`)
        .setLabel(`myself & guest(s)`)
        .setStyle(ButtonStyle.Primary),
      actionRow = new ActionRowBuilder().addComponents(
        myselfButton,
        guestButton
      )

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `Who are you marking as attending this event?`,
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
