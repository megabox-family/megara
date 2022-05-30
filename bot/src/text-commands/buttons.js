import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { getWelcomeChannel } from '../repositories/guilds.js'
import { getPublicChannelList } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  const argArr = args.split(' ')

  if (!argArr || argArr.length !== 2) {
    message.reply(`\
      \nThe ${commandSymbol}${command} requires 2 arguments, the type of buttons to be generated and in what channel id.
      \n Example: \`${commandSymbol}${command} notification 753376109764018206\`
    `)

    return
  } else if (![`public`, `notification`].includes(argArr[0].toLowerCase())) {
    message.reply(
      `Invalid button type, valid options are **public** & **notification**, please try again.`
    )

    return
  }

  const guild = message.guild,
    buttonChannel = guild.channels.cache.get(argArr[1])

  if (!buttonChannel) {
    message.reply(`Invalid channel id, please try again.`)

    return
  }

  if (argArr[0].toLowerCase() === `public`) {
    const welcomeChannelId = await getWelcomeChannel(guild.id),
      publicChannelIds = await getPublicChannelList(guild.id, welcomeChannelId)

    if (publicChannelIds.length === 0) return

    const buttonArray = [],
      fragmentedButtonArray = []

    publicChannelIds.forEach(record => {
      buttonArray.push(
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`!join-channel: ${record.channelId}`)
            .setLabel(`Join ${record.channelName}`)
            .setStyle('SUCCESS'),
          new MessageButton()
            .setCustomId(`!leave-channel: ${record.channelId}`)
            .setLabel(`Leave ${record.channelName}`)
            .setStyle('DANGER')
        )
      )
    })

    const remainder = buttonArray.length / 5

    for (let i = 0; i < remainder; i++) {
      fragmentedButtonArray.push([])

      for (let j = 0; j < 5; j++) {
        if (buttonArray[0] == null) break

        fragmentedButtonArray[i].push(buttonArray[0])

        buttonArray.shift()
      }
    }

    fragmentedButtonArray.forEach(buttonArray => {
      buttonChannel.send({ components: buttonArray })
    })
  } else {
    const serverNotificationSquad = guild.roles.cache.find(
        role => role.name === `server notification squad`
      ),
      channelNotificationSquad = guild.roles.cache.find(
        role => role.name === `channel notification squad`
      ),
      colorNotificationSquad = guild.roles.cache.find(
        role => role.name === `color notification squad`
      ),
      notificationButtons = [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`!subscribe: ${serverNotificationSquad.id}`)
            .setLabel(`Subscribe to server notifications`)
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`!unsubscribe: ${serverNotificationSquad.id}`)
            .setLabel(`Unsubscribe from server notifications`)
            .setStyle('SECONDARY')
        ),
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`!subscribe: ${channelNotificationSquad.id}`)
            .setLabel(`Subscribe to channel notifications`)
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`!unsubscribe: ${channelNotificationSquad.id}`)
            .setLabel(`Unsubscribe from channel notifications`)
            .setStyle('SECONDARY')
        ),
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`!subscribe: ${colorNotificationSquad.id}`)
            .setLabel(`Subscribe to color notifications`)
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`!unsubscribe: ${colorNotificationSquad.id}`)
            .setLabel(`Unsubscribe from color notifications`)
            .setStyle('SECONDARY')
        ),
      ]

    buttonChannel.send({
      components: notificationButtons,
    })
  }
}
