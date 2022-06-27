import { getBot } from '../cache-bot.js'
import { directMessageError } from '../utils/error-logging.js'
import { removeMemberFromChannel } from '../utils/channels.js'
import { getChannelType } from '../repositories/channels.js'

export default async function (interaction) {
  const leaveChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = leaveChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id)

  if (!leaveChannel) {
    guildMember
      .send(
        `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
      )
      .catch(error => directMessageError(error, guildMember))

    return
  }

  const result = await removeMemberFromChannel(guildMember, leaveChannel.id)

  if (!result) {
    if (!interaction?.guild)
      interaction.reply({
        content: `${leaveChannel} is not a leavable channel in **${guild.name}** 🤔`,
      })
    else
      interaction.reply({
        content: `${leaveChannel} is not a leavable channel 🤔`,
      })

    return
  }

  const channelType = await getChannelType(leaveChannel.id)

  let messageContent

  if (result === `not removed`)
    if (!interaction?.guild)
      messageContent = `You tried leaving a channel that no longer exists in **${guild.name}**, sorry for the trouble 🥺`
    else
      messageContent = `You tried leaving a channel that no longer exists, sorry for the trouble 🥺`
  else if (result === `removed`) {
    if (!interaction?.guild) {
      const category = guild.channels.cache.get(leaveChannel.parentId),
        categoryContext = category
          ? ` in the **${category.name}** category`
          : ``

      messageContent = `
        You've been removed from the **${leaveChannel}** channel${categoryContext} within the **${guild.name}** server 👋\
        \nYou can jump to this channel from this message by clicking here → **${leaveChannel}**\
      `
    } else messageContent = `You've been removed from **${leaveChannel}** 👋`

    if (channelType === `private`)
      messageContent += `
        \n*Note: when leaving a private channel if paired voice channels exist they won't immediatly hide, in most cases it takes less than 10 seconds.*
      `
  } else {
    if (!interaction?.guild)
      messageContent = `You aren't in **${leaveChannel}** within the **${guild.name}** 🤔`
    else messageContent = `You aren't in **${leaveChannel}** 🤔`
  }

  interaction.reply({
    content: messageContent,
    ephemeral: true,
  })
}
