import { MessageActionRow, MessageButton } from 'discord.js'
import { getGuild } from '../repositories/guild-cache.js'
import { checkType } from '../utils.js'

export default async function (interaction) {
  const guild = getGuild(),
    joinableChannel = guild.channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    channelType = checkType(joinableChannel, guild.roles.cache),
    leaveButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!leaveChannel: ${joinableChannel.id}`)
        .setLabel(`Leave ${joinableChannel.name}`)
        .setStyle('DANGER')
    )

  if (channelType === `joinable`) {
    if (
      !guild.channels.cache
        .get(joinableChannel.id)
        .permissionsFor(guild.members.cache.get(interaction.user.id))
        .toArray()
        .includes('VIEW_CHANNEL')
    ) {
      guild.channels.cache
        .get(joinableChannel.id)
        .permissionOverwrites.create(interaction.user.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          interaction.user.send({
            content: `You have been added to <#${joinableChannel.id}>! If you would like to leave press the button below.`,
            components: [leaveButtonRow],
          })
        )
    } else
      interaction.user.send({
        content: `You already have access to that channel, if you would like to leave press the button below.`,
        components: [leaveButtonRow],
      })
  } else
    interaction.user.send(
      `Sorry, <#${joinableChannel.id}> is not a joinable channel.`
    )
}
