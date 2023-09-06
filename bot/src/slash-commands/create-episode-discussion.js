import {
  ChannelType,
  ApplicationCommandOptionType,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import { getThreadByName } from '../utils/threads.js'
import { queueApiCall } from '../api-queue.js'
import { getCommandByName } from '../utils/slash-commands.js'

export const description = `Generates a forum post in relation to an episode in a series.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `season-number`,
      description: `The seseaon number that the episode belongs to.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 1,
    },
    {
      name: `episode-number`,
      description: `The episode number.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 1,
    },
  ]

export default async function (interaction) {
  const { guild, options, channel } = interaction,
    seasonNumber = options.getInteger(`season-number`),
    episodeNumber = options.getInteger(`episode-number`),
    parentForum = guild.channels.cache.get(channel.parentId),
    parentName = parentForum.name.replaceAll(`-`, ` `),
    threadName = `${parentName} s${seasonNumber} e${episodeNumber}`

  if (
    parentForum.type !== ChannelType.GuildForum ||
    !channel.name.match(`general`)
  ) {
    const episodeCommand = getCommandByName(`create-episode-discussion`),
      episodeCommandTag = `</${episodeCommand.name}:${episodeCommand.id}>`

    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `The ${episodeCommandTag} can only be used within the **general post** of an episodic forum 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const existingThread = await getThreadByName(parentForum, threadName)

  if (existingThread) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `The thread for **${threadName}** already exists, here it is → ${existingThread}`,
        ephemeral: true,
      },
    })

    return
  }

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const { availableTags } = parentForum,
    appliedTagIds = []

  let discussionTag = availableTags?.find(tag => tag.name === `discussion`),
    episodeTag = availableTags?.find(tag => tag.name === `episode`),
    spoilersTag = availableTags?.find(tag => tag.name === `spoilers`)

  if (discussionTag) appliedTagIds.push(discussionTag.id)
  if (episodeTag) appliedTagIds.push(episodeTag.id)
  if (spoilersTag) appliedTagIds.push(spoilersTag.id)

  const threadMessage = `Discussion for ${parentName} season ${seasonNumber} episode ${episodeNumber}.`,
    thread = await queueApiCall({
      apiCall: `create`,
      djsObject: parentForum.threads,
      parameters: {
        name: threadName,
        type: ChannelType.PublicThread,
        reason: `Needed a thread for discussion of an episode in a series`,
        message: threadMessage,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        appliedTags: appliedTagIds,
      },
    }).catch(error =>
      console.log(
        `I was unable to create the thread, see error below:\n${error}`
      )
    )

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `A new post has been created → ${thread} **(spoiler warning❗)**`,
  })
}
