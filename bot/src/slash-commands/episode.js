import { MessageActionRow, MessageButton } from 'discord.js'
import { getThreadByName } from '../utils/threads.js'

export const description = `Generates a joinable private thread in relation to an episode in a series to hide spoilers.`
export const defaultPermission = false,
  options = [
    {
      name: `season-number`,
      description: `The seseaon number that the episode belongs to.`,
      type: `INTEGER`,
      required: true,
      minValue: 1,
    },
    {
      name: `episode-number`,
      description: `The episode number.`,
      type: `INTEGER`,
      required: true,
      minValue: 1,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    seasonNumber = options.getInteger(`season-number`),
    episodeNumber = options.getInteger(`episode-number`),
    premiumTier = guild.premiumTier,
    channel = interaction.channel,
    threadName = `${channel.name} season ${seasonNumber} episode ${episodeNumber}`,
    existingThread = await getThreadByName(channel, threadName)

  if (existingThread) {
    const episodeButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-thread: ${existingThread.id}`)
        .setLabel(`Join Thread`)
        .setStyle('SUCCESS')
    )

    await interaction.reply({
      content: `The thread for **${threadName}** already exists, click the join button below to join it.`,
      components: [episodeButton],
      ephemeral: true,
    })

    return
  }

  await interaction.deferReply()

  let thread, threadType

  if (![`TIER_2`, `TIER_3`].includes(premiumTier))
    threadType = `GUILD_PUBLIC_THREAD`
  else threadType = `GUILD_PRIVATE_THREAD`

  thread = await channel.threads
    .create({
      name: threadName,
      autoArchiveDuration: 10080,
      type: threadType,
      reason: 'Needed a thread for an episode in a show',
    })
    .catch(error =>
      console.log(
        `I was unable to create a ${threadType} thread, see error below:\n${error}`
      )
    )

  const episodeButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!join-thread: ${thread.id}`)
      .setLabel(`Join Thread`)
      .setStyle('SUCCESS')
  )

  // interaction.deferReply()
  // interaction.deleteReply()

  await interaction.editReply({
    content: `A new thread for **${channel.name} season ${seasonNumber} episode ${episodeNumber}** has been created, press the button below to join the thread (**spoiler warning**):`,
    components: [episodeButton],
  })
}
