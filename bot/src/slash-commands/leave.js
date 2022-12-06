import { ChannelType } from 'discord.js'
import {
  removeMemberFromChannel,
  checkIfmemberneedsToBeRemoved,
} from '../utils/channels.js'
import { getChannelType } from '../repositories/channels.js'

export const description = `Removes you from the channel you use this command in.`
export const dmPermission = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    channel = interaction.channel

  if (channel.type !== ChannelType.GuildText) {
    await interaction.editReply({
      content: `The \`/leave\` command only works in text channels, not voice channels or threads 🤔`,
      ephemeral: true,
    })

    return
  }

  const context = await checkIfmemberneedsToBeRemoved(member, channel.id)

  if (!context) {
    if (!interaction?.guild)
      await interaction.editReply({
        content: `${channel} is not a leavable channel in **${guild.name}** 🤔`,
      })
    else
      await interaction.editReply({
        content: `${channel} is not a leavable channel 🤔`,
      })

    return
  }

  const channelType = await getChannelType(channel.id)

  let messageContent

  if (context === `not removed`)
    messageContent = `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
  else if (context?.action) {
    messageContent = `
        You've been removed from the **${channel}** channel 👋\
        \nIt may appear that you're still part of **${channel}** until you navigate to another channel within **${guild.name}**.\
      `

    if (channelType === `private`)
      messageContent += `
        \n*Note: when leaving a private channel if paired voice channels exist they won't immediatly hide, in most cases it takes less than 10 seconds.*
      `
  } else {
    messageContent = `You aren't in the **${channel}** channel 🤔`
  }

  await interaction.editReply(messageContent)

  await removeMemberFromChannel(member, channel.id)
}
