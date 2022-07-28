import { MessageActionRow, MessageButton } from 'discord.js'
import { getPublicChannels } from '../repositories/channels.js'

export const description = `Generate public channel or notification buttons in a specified channel.`
export const dmPermission = false,
  options = [
    {
      name: `button-type`,
      description: `The type of buttons you want to generate.`,
      type: `STRING`,
      required: true,
      choices: [
        { name: `public`, value: `public` },
        { name: `notification`, value: `notification` },
      ],
    },
    {
      name: `channel-id`,
      description: `The channel id of the channel you want to generate the buttons in.`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    buttonType = options.getString(`button-type`),
    channelId = options.getString(`channel-id`),
    optionChannel = guild.channels.cache.get(channelId)

  if (!optionChannel) {
    await interaction.editReply({
      content: `You provided an invalid channel id, please try again.`,
      ephemeral: true,
    })

    return
  }

  if (buttonType === `public`) {
    const publicChannelIds = await getPublicChannels(guild.id)

    if (publicChannelIds.length === 0) return

    const buttonArray = [],
      fragmentedButtonArray = []

    publicChannelIds.forEach(record => {
      buttonArray.push(
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`!join-channel: ${record.id}`)
            .setLabel(`Join ${record.name}`)
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`!leave-channel: ${record.id}`)
            .setLabel(`Leave ${record.name}`)
            .setStyle('SECONDARY')
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

    for (const buttonArray of fragmentedButtonArray) {
      await optionChannel.send({ components: buttonArray })
    }
  } else {
    const serverNotificationSquad = guild.roles.cache.find(
        role => role.name === `-server notifications-`
      ),
      channelNotificationSquad = guild.roles.cache.find(
        role => role.name === `-channel notifications-`
      ),
      colorNotificationSquad = guild.roles.cache.find(
        role => role.name === `-color notifications-`
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

    await optionChannel.send({
      components: notificationButtons,
    })
  }

  await interaction.editReply({
    content: `${buttonType} buttons were sent to ${optionChannel} 🤓`,
    ephemeral: true,
  })
}
