import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import {
  removeMemberFromChannel,
  checkIfMemberneedsToBeRemoved,
} from '../utils/channels.js'
import { getChannelType } from '../repositories/channels.js'
import { queueApiCall } from '../api-queue.js'

const {
  AnnouncementThread,
  GuildAnnouncement,
  GuildForum,
  GuildStageVoice,
  GuildText,
  GuildVoice,
  PrivateThread,
  PublicThread,
} = ChannelType

export const description = `Completely removes you from the channel you specify.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel`,
      description: `The channel you would like to leave.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [
        GuildAnnouncement,
        GuildForum,
        GuildStageVoice,
        GuildText,
        GuildVoice,
      ],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { member, options } = interaction,
    channel = options.getChannel(`channel`),
    { name } = channel

  const removeResult = await removeMemberFromChannel(member, channel)

  if (removeResult === `welcome`) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You cannot leave the ${channel} channel 🤔`,
    })

    return
  } else if (!removeResult) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Either the **${name}** doesn't exist or you already don't have access 🤔`,
    })

    return
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `You have been removed from **${channel?.name}** 👋`,
  })
}
