import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import { queueApiCall } from '../api-queue.js'

const {
  AnnouncementThread,
  GuildAnnouncement,
  GuildForum,
  GuildStageVoice,
  GuildText,
  GuildVoice,
  GuildCategory,
} = ChannelType

export const description = `Allows you to override the sort position of channel when channel sorting is enabled.`,
  dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel`,
      description: `The channel you'd like to override the sort postiion for.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [
        AnnouncementThread,
        GuildAnnouncement,
        GuildForum,
        GuildStageVoice,
        GuildText,
        GuildVoice,
        GuildCategory,
      ],
    },
    {
      name: `position-override`,
      description: `Positive numbers override position from the top, negative from the bottom.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    channel = options.getChannel(`channel`),
    positionOverride = options.getInteger(`position-override`)

  console.log(channel, positionOverride)
}
