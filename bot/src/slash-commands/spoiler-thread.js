import { ApplicationCommandOptionType, ButtonStyle } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ChannelType } from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generates a joinable private thread in relation to a specified topic to hide spoilers.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `thread-name`,
      description: `The name you want to give to the thread.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const guild = interaction.guild,
    options = interaction.options,
    threadName = options.getString(`thread-name`),
    premiumTier = guild.premiumTier,
    channel = interaction.channel

  let thread, threadType

  if (premiumTier < 2) threadType = ChannelType.PublicThread
  else threadType = ChannelType.PrivateThread

  thread = await queueApiCall({
    apiCall: `create`,
    djsObject: channel.threads,
    parameters: {
      name: threadName,
      autoArchiveDuration: 10080,
      type: threadType,
      reason: 'Needed a private thread for a specified topic',
    },
  })

  const threadButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`!join-thread: ${thread.id}`)
      .setLabel(`Join Thread`)
      .setStyle(ButtonStyle.Success)
  )

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `A new private thread for **${threadName}** has been created, press the button below to join the thread (**spoiler warning**):`,
      components: [threadButton],
    },
  })
}
