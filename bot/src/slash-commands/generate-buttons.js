import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { getServerSubscriptionButtonText } from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Generate buttons for Channels & Roles and Subscriptions in a given channel.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const { guild } = interaction

  const buttons = [
    new ButtonBuilder()
      .setLabel(`channels & roles`)
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guild.id}/customize-community`),
  ]

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

  const row = new ActionRowBuilder().addComponents(buttons)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { components: [row] },
  })
}
