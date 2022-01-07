import { getBot } from '../cache-bot.js'
import { MessageActionRow, MessageButton } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { getCommandSymbol } from '../repositories/guilds.js'
import {
  getFormatedCommandChannels,
  getChannelType,
} from '../repositories/channels.js'

export default async function (interaction) {
  const interactionChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = interactionChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id),
    channelType = await getChannelType(interactionChannel.id),
    userOverwrite = interactionChannel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === guildMember.id
    ),
    commandSymbol = await getCommandSymbol(guild.id),
    commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    ),
    leaveButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!leave-channel: ${interactionChannel.id}`)
        .setLabel(`Leave ${interactionChannel.name}`)
        .setStyle('DANGER')
    )

  if (channelType === `joinable`) {
    if (!userOverwrite) {
      interactionChannel.permissionOverwrites
        .create(guildMember.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          guildMember
            .send({
              content: `
              You have been added to <#${interactionChannel.id}> in the ${guild.name} server! 😁\
              \nIf you joined by accident press the button below, or use the \`${commandSymbol}leave\` command (ex: \`${commandSymbol}leave ${interactionChannel.name}\`) to leave.\
              \nThe \`${commandSymbol}leave\` command works in these channels: ${commandChannels}
            `,
              components: [leaveButtonRow],
            })
            .catch(error => directMessageError(error, guildMember))
        )
    } else
      guildMember
        .send({
          content: `
          You already have access to <#${interactionChannel.id}> in the ${guild.name} server 🤔\
          \nIf you'd like to leave press the button below, or use the \`!leave\` command (ex: \`${commandSymbol}leave ${interactionChannel.name}\`).\
          \nThe \`${commandSymbol}leave\` command works in these channels: ${commandChannels}
        `,
          components: [leaveButtonRow],
        })
        .catch(error => directMessageError(error, guildMember))
  } else
    guildMember
      .send(
        `Sorry, ${interactionChannel.name} is not a joinable channel in the ${guild.name} server 🥺`
      )
      .catch(error => directMessageError(error, guildMember))
}
