import { removeMemberFromChannel } from '../utils/channels.js'
import { getChannelType } from '../repositories/channels.js'
import { directMessageError } from '../utils/error-logging.js'

export const description = `Removes you from the channel you use this command in.`
export const defaultPermission = false

export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    channel = interaction.channel

  if (channel.type !== `GUILD_TEXT`) {
    await interaction.reply({
      content: `The \`/leave\` command only works in text channels, not voice channels or threads 🤔`,
      ephemeral: true,
    })

    return
  }

  await interaction.reply({
    content: `I'm attempting to remove you from this channel... you should receive a direct message shortly.`,
    ephemeral: true,
  })

  const result = await removeMemberFromChannel(member, channel.id)

  if (!result) {
    if (!interaction?.guild)
      interaction.reply({
        content: `${channel} is not a leavable channel in **${guild.name}** 🤔`,
      })
    else
      interaction.reply({ content: `${channel} is not a leavable channel 🤔` })

    return
  }

  const channelType = await getChannelType(channel.id)

  let messageContent

  if (result === `not removed`)
    messageContent = `You tried leaving a channel that no longer exists in **${guild.name}**, sorry for the trouble 🥺`
  else if (result === `removed`) {
    const category = guild.channels.cache.get(channel.parentId),
      categoryContext = category ? ` in the **${category.name}** category` : ``

    messageContent = `
        You've been removed from the **${channel}** channel${categoryContext} within the **${guild.name}** server 👋\
        \nIt may appear that you're still part of **${channel}** until you navigate to another channel within **${guild.name}**.\
      `

    if (channelType === `private`)
      messageContent += `
        \n*Note: when leaving a private channel if paired voice channels exist they won't immediatly hide, in most cases it takes less than 10 seconds.*
      `
  } else {
    messageContent = `You aren't in **${channel}** within the **${guild.name}** 🤔`
  }

  member
    .send({
      content: messageContent,
    })
    .catch(error => directMessageError(error, member))
}
