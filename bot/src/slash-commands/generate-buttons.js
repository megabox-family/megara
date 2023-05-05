import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'
import { getServerSubscriptionButtonText } from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generate buttons for the channel list, color list, and the notification manager in a given channel.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const { guild, channel } = interaction

  const buttons = [
      new ButtonBuilder()
        .setCustomId(`!channel-list:`)
        .setLabel(`channel list`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!color-list:`)
        .setLabel(`color list`)
        .setStyle(ButtonStyle.Primary),
    ],
    row = new ActionRowBuilder().addComponents(buttons)

  const serverSubscriptionButtonText = await getServerSubscriptionButtonText(
    guild.id
  )

  if (serverSubscriptionButtonText) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(serverSubscriptionButtonText)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/role-subscriptions`)
    )
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { components: [row] },
  })
}
