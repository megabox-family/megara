import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { deleteAttendee, getAttendeeRecord } from '../repositories/attendees.js'
import { getMessageLinkContext } from './attend.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
    },
  })

  const { guild, user, channel, message } = interaction,
    { messageId } = message.reference

  const eventMessage = await queueApiCall({
    apiCall: `fetch`,
    djsObject: channel.messages,
    parameters: messageId,
  })

  let replyMessageContent = `Your attendance information has been removed 😭`
  const buttons = []

  if (eventMessage?.thread)
    await queueApiCall({
      apiCall: `remove`,
      djsObject: eventMessage.thread.members,
      parameters: user.id,
    })
  else if (channel.type === ChannelType.PublicThread) {
    const parent = guild.channels.cache.get(channel.parentId),
      parentIsForum = parent.type === ChannelType.GuildForum,
      channelNomenclature = parentIsForum ? `post` : `thread`,
      button = new ButtonBuilder()
        .setCustomId(`!leave-thread:`)
        .setLabel(`leave ${channelNomenclature}`)
        .setStyle(ButtonStyle.Danger)

    replyMessageContent += `\n\nIf you'd like to leave this ${channelNomenclature} press the button below.`

    buttons.push(button)
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: replyMessageContent,
      components:
        buttons.length > 0
          ? [new ActionRowBuilder().addComponents(buttons)]
          : [],
    },
  })

  const { guestCount } = await getAttendeeRecord(user.id, messageId),
    spots = 1 + guestCount,
    { organizer, spotNomencalture, messageLink } = await getMessageLinkContext(
      guild,
      channel,
      messageId
    )

  await queueApiCall({
    apiCall: `send`,
    djsObject: organizer,
    parameters: {
      content: `${user}, who originally requested **${spots} ${spotNomencalture}**, has unattended an event you organized → ${messageLink}`,
    },
  })

  await deleteAttendee(user.id, messageId)
}
