import {
  ChannelType,
  ApplicationCommandOptionType,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getCommandByName } from '../utils/slash-commands.js'

export const description = `Generates a forum channel for discussing a series & its episodes in the specified category.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `category`,
      description: `The category you'd like to create the forum channel in.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [ChannelType.GuildCategory],
    },
    {
      name: `channel-name`,
      description: `The name of the channel you're creating`,
      type: ApplicationCommandOptionType.String,
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
    category = options.getChannel(`category`)

  let channelName = options.getString(`channel-name`)

  if (channelName.match(`\\s`)) channelName = channelName.replaceAll(` `, `-`)

  const existingChannel = guild.channels.cache.get(
    channel =>
      channel.name === channelName && channel.type === ChannelType.GuildForum
  )

  if (existingChannel) {
    queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${existingChannel} already exists in the **${category.name}** category 🤔`,
    })

    return
  }

  const formattedChannelName = channelName.replaceAll(`-`, ` `),
    generalThreadName = `${formattedChannelName} general`,
    newChannel = await queueApiCall({
      apiCall: `create`,
      djsObject: category.children,
      parameters: {
        name: channelName,
        type: ChannelType.GuildForum,
        availableTags: [
          { name: `discussion` },
          { name: `episode` },
          { name: `season` },
          { name: `spoilers`, emoji: { name: `❗` } },
        ],
        defaultReactionEmoji: { name: `🍿` },
        topic: `Please use the /create-episode-discussion & /create-season-discussion in the ${generalThreadName} post to created discussions for episodes & seasons.`,
      },
    })

  await queueApiCall({
    apiCall: `edit`,
    djsObject: newChannel,
    parameters: {
      flags: `RequireTag`,
    },
  })

  const episodeCommand = getCommandByName(`create-episode-discussion`),
    seasonCommand = getCommandByName(`create-season-discussion`),
    episodeCommandTag = `</${episodeCommand.name}:${episodeCommand.id}>`,
    seasonCommandTag = `</${seasonCommand.name}:${seasonCommand.id}>`,
    discussionTag = newChannel.availableTags.find(
      tag => tag.name === `discussion`
    ),
    thread = await queueApiCall({
      apiCall: `create`,
      djsObject: newChannel.threads,
      parameters: {
        name: generalThreadName,
        type: ChannelType.PublicThread,
        reason: `Needed a general thread for discussion of a series`,
        message:
          `General discussion for ${newChannel}, no spoilers!` +
          `\n\nPlease use the ${episodeCommandTag} & ${seasonCommandTag} to create posts for discussing specific episodes & seasons.`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        appliedTags: [discussionTag.id],
      },
    })

  await queueApiCall({
    apiCall: `edit`,
    djsObject: thread,
    parameters: {
      flags: `Pinned`,
    },
  })

  queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `${newChannel} has been created in the **${category.name}** category 🙌`,
  })
}
