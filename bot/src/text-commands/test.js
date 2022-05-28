import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { getWelcomeChannel } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  const guild = message.guild,
    welcomeChannelId = await getWelcomeChannel(guild.id),
    welcomeChannel = guild.channels.cache.get(welcomeChannelId),
    serverNotificationSquad = guild.roles.cache.find(
      role => role.name === `server notification squad`
    ),
    channelNotificationSquad = guild.roles.cache.find(
      role => role.name === `channel notification squad`
    ),
    colorNotificationSquad = guild.roles.cache.find(
      role => role.name === `color notification squad`
    ),
    serverButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!subscribe: ${serverNotificationSquad.id}`)
        .setLabel(`Subscribe to server notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${serverNotificationSquad.id}`)
        .setLabel(`Unsubscribe from server notifications`)
        .setStyle('DANGER')
    ),
    channelButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!subscribe: ${channelNotificationSquad.id}`)
        .setLabel(`Subscribe to channel notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${channelNotificationSquad.id}`)
        .setLabel(`Unsubscribe from channel notifications`)
        .setStyle('DANGER')
    ),
    colorButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!subscribe: ${colorNotificationSquad.id}`)
        .setLabel(`Subscribe to color notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${colorNotificationSquad.id}`)
        .setLabel(`Unsubscribe from color notifications`)
        .setStyle('DANGER')
    )

  welcomeChannel.send({
    components: [serverButtonRow, channelButtonRow, colorButtonRow],
  })
}
