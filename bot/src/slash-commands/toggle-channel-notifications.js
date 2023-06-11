import { ApplicationCommandOptionType } from 'discord.js'
import {
  getPauseChannelNotifications,
  setPauseChannelNotifications,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to pause or resume a variety of automated notification messages.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    options = interaction.options,
    notificationType = options.getString(`notification-type`),
    pauseChannelNotifications = await getPauseChannelNotifications(guild.id)

  let toggleState

  if (pauseChannelNotifications) {
    await setPauseChannelNotifications(false, guild.id)

    toggleState = `resumed`
  } else {
    await setPauseChannelNotifications(true, guild.id)

    toggleState = `paused`
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `Channel notifications have been ${toggleState}.`,
  })
}
