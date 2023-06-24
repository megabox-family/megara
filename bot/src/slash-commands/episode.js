import { ChannelType, ApplicationCommandOptionType } from 'discord.js'
import { capitalCase } from 'change-case'
import { getThreadByName } from '../utils/threads.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generates a forum thread in relation to an episode in a series.`
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
    threadName = `${capitalCase(
      parentForum.name
    )} S${seasonNumber} E${episodeNumber}`

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

  const episodeTag = parentForum.availableTags?.find(
      tag => tag.name === 'episode'
    ),
    existingThread = await getThreadByName(parentForum, threadName)

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

  const thread = await queueApiCall({
    apiCall: `create`,
    djsObject: parentForum.threads,
    parameters: {
      name: threadName,
      type: ChannelType.PublicThread,
      reason: 'Needed a thread for an episode in a show',
      message: `Discussion for ${capitalCase(
        parentForum.name
      )} Season ${seasonNumber} Episode ${episodeNumber}`,
      autoArchiveDuration: 10080,
      appliedTags: episodeTag ? [episodeTag] : [],
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
