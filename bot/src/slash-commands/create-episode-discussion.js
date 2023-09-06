import {
  ChannelType,
  ApplicationCommandOptionType,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import { getThreadByName } from '../utils/threads.js'
import { queueApiCall } from '../api-queue.js'
import { collator } from '../utils/general.js'

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
  const guild = interaction.guild,
    options = interaction.options,
    seasonNumber = options.getInteger(`season-number`),
    episodeNumber = options.getInteger(`episode-number`),
    channel = interaction.channel,
    parentForum = guild.channels.cache.get(channel.parentId),
    parentName = parentForum.name.replaceAll(`-`, ` `),
    threadName = `${parentName} s${seasonNumber} e${episodeNumber}`

  if (parentForum.type !== ChannelType.GuildForum) {
    return await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content:
          'Sorry, this command can only be used in forum channels :face_holding_back_tears:',
        ephemeral: true,
      },
    })
  }

  const existingThread = await getThreadByName(parentForum, threadName)

  if (existingThread) {
    return await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `The thread for **${threadName}** already exists, here it is → ${existingThread}`,
        ephemeral: true,
      },
    })
  }

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const { availableTags } = parentForum,
    appliedTagIds = []

  let discussionTag = availableTags?.find(tag => tag.name === `discussion`),
    episodeTag = availableTags?.find(tag => tag.name === `episode`)

  if (discussionTag) appliedTagIds.push(discussionTag.id)
  if (episodeTag) appliedTagIds.push(episodeTag.id)

  const thread = await queueApiCall({
    apiCall: `create`,
    djsObject: parentForum.threads,
    parameters: {
      name: threadName,
      type: ChannelType.PublicThread,
      reason: `Needed a thread for discussion of an episode in a series`,
      message: `Discussion for ${threadName}.`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      appliedTags: appliedTagIds,
    },
  }).catch(error =>
    console.log(`I was unable to create the thread, see error below:\n${error}`)
  )

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `A new thread for **${threadName}** has been created, click here to join → ${thread} **(spoiler warning)**`,
  })
}
