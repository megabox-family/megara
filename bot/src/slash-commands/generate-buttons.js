import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'
import { getServerSubscriptionButtonText } from '../repositories/guilds.js'

export const description = `Generate buttons for the channel list, color list, and the notification manager in a given channel.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel-id`,
      description: `The channel id of the channel you want to generate the buttons in.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    channelId = options.getString(`channel-id`),
    optionChannel = guild.channels.cache.get(channelId)

  if (!optionChannel) {
    await interaction.editReply({
      content: `You provided an invalid channel id, please try again.`,
      ephemeral: true,
    })

    return
  }

  const buttons = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!channel-list: joinable`)
        .setLabel(`Joinable Channel List`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!channel-list: public`)
        .setLabel(`Public Channel List`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!channel-list: archived`)
        .setLabel(`Archived Channel List`)
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!notification-manager:`)
        .setLabel(`Notification Manager`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!color-list:`)
        .setLabel(`Color List`)
        .setStyle(ButtonStyle.Primary)
    ),
  ]

  const serverSubscriptionButtonText = await getServerSubscriptionButtonText(
    guild.id
  )

  if (serverSubscriptionButtonText) {
    buttons.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(serverSubscriptionButtonText)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/role-subscriptions`)
      )
    )
  }

  await optionChannel.send({
    components: buttons,
  })

  await interaction.editReply({
    content: `Buttons were sent to ${optionChannel} 🤓`,
    ephemeral: true,
  })
}
