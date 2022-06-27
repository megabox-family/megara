import { MessageActionRow, MessageButton } from 'discord.js'

export const description = `Generates a joinable private thread in relation to a specified topic to hide spoilers.`
export const defaultPermission = false,
  options = [
    {
      name: `thread-name`,
      description: `The name you want to give to the thread.`,
      type: `STRING`,
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
    threadType = `GUILD_PUBLIC_THREAD`
  else threadType = `GUILD_PRIVATE_THREAD`

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

  const threadButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!join-thread: ${thread.id}`)
      .setLabel(`Join Thread`)
      .setStyle('SUCCESS')
  )

  await interaction.editReply({
    content: `A new private thread for **${threadName}** has been created, press the button below to join the thread (**spoiler warning**):`,
    components: [threadButton],
  })
}
