import { getBot } from '../cache-bot.js'
import { MessageActionRow, MessageButton } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { getCommandSymbol } from '../repositories/guilds.js'
import { getFormatedCommandChannels } from '../repositories/channels.js'

export default async function (interaction) {
  const interactionChannel = getBot().channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    guild = interactionChannel.guild,
    guildMember = guild.members.cache.get(interaction.user.id),
    userOverwrite = interactionChannel.permissionOverwrites.cache.find(
      permissionOverwrite => permissionOverwrite.id === guildMember.id
    ),
    commandSymbol = await getCommandSymbol(guild.id),
    commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    ),
    joinButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${interactionChannel.id}`)
        .setLabel(`Join ${interactionChannel.name}`)
        .setStyle('SUCCESS')
    )

  if (userOverwrite) {
    userOverwrite.delete()

    guildMember
      .send({
        content: `
          You have been removed from <#${interactionChannel.id}> in the ${guild.name} server 👋\
          \nIf you left by accident press the button below, or use the \`${commandSymbol}join\` command (ex: \`${commandSymbol}join ${interactionChannel.name}\`) to re-join.\
          \nThe \`${commandSymbol}join\` command works in these channels: ${commandChannels}
        `,
        components: [joinButtonRow],
      })
      .catch(error => directMessageError(error, guildMember))
  } else
    guildMember
      .send({
        content: `
          You tried to leave a channel you aren't a part of, <#${interactionChannel.id}> in the ${guild.name} server 🤔\
          \nIf you'd like to join press the button below, or use the \`${commandSymbol}join\` command (ex: \`${commandSymbol}join ${interactionChannel.name}\`).\
          \nThe \`${commandSymbol}join\` command works in these channels: ${commandChannels}
        `,
        components: [joinButtonRow],
      })
      .catch(error => directMessageError(error, guildMember))
}
