import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { getAnnouncementChannel } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  const guild = message.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id),
    announcementChannel = guild.channels.cache.get(announcementChannelId),
    channelNotificationSquad = guild.roles.cache.find(
      role => role.name === `channel notification squad`
    ),
    colorNotificationSquad = guild.roles.cache.find(
      role => role.name === `color notification squad`
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

  announcementChannel.send({ components: [channelButtonRow, colorButtonRow] })
}
