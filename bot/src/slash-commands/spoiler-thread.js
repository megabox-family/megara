import { ApplicationCommandOptionType, ButtonStyle } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ChannelType } from 'discord.js'

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
  await interaction.deferReply()

  const guild = interaction.guild,
    options = interaction.options,
    threadName = options.getString(`thread-name`),
    premiumTier = guild.premiumTier,
    channel = interaction.channel

  let thread, threadType

  if (![`TIER_2`, `TIER_3`].includes(premiumTier))
    threadType = ChannelType.PublicThread
  else threadType = ChannelType.PrivateThread

  thread = await channel.threads
    .create({
      name: threadName,
      autoArchiveDuration: 10080,
      type: threadType,
      reason: 'Needed a thread a private thread for a specified topic',
    })
    .catch(error =>
      console.log(
        `I was unable to create a ${threadType} thread, see error below:\n${error}`
      )
    )

  const threadButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`!join-thread: ${thread.id}`)
      .setLabel(`Join Thread`)
      .setStyle(ButtonStyle.Success)
  )

  await interaction.editReply({
    content: `A new private thread for **${threadName}** has been created, press the button below to join the thread (**spoiler warning**):`,
    components: [threadButton],
  })
}
