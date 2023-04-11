import { getBot } from '../cache-bot.js'
import { addMemberToChannel } from '../utils/channels.js'
import { getChannelType } from '../repositories/channels.js'

export default async function (interaction) {
  let isEphemeral = false

  if (interaction?.guild) isEphemeral = true

  await interaction.deferReply({ ephemeral: isEphemeral })

  const joinChannel = getBot().channels.cache.get(
    interaction.customId.match(`(?!:)[0-9]+`)[0]
  )

  if (!joinChannel) {
    await interaction.editReply(
      `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
    )

    return
  }

  const guild = joinChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id),
    result = await addMemberToChannel(guildMember, joinChannel.id)

  if (!result) {
    if (!interaction?.guild)
      await interaction.editReply({
        content: `${joinChannel} is not a joinable channel in **${guild.name}** 🤔`,
      })
    else
      await interaction.editReply({
        content: `${joinChannel} is not a joinable channel 🤔`,
      })

    return
  }

  const channelType = await getChannelType(joinChannel.id)

  let messageContent

  if (result === `not added`)
    if (!interaction?.guild)
      messageContent = `You tried joining a channel that no longer exists in **${guild.name}**, sorry for the trouble 🥺`
    else
      messageContent = `You tried joining a channel that no longer exists, sorry for the trouble 🥺`
  else if (result === `added`) {
    messageContent =
      `You've been added to **${joinChannel}** ← click here to jump to it 😊` +
      `\n\n*Note: You can join and leave channels using the \`/channel-list\` command.*`

    if (channelType === `private`)
      messageContent += `\n*Note: when joining a private channel if paired voice channels exist they won't immediatly show, in most cases it takes less than 10 seconds for them to populate.*`
  } else {
    messageContent = `You already have access to **${joinChannel}** 🤔`
  }

  await interaction.editReply({
    content: messageContent,
    ephemeral: true,
  })
}
