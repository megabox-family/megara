import { ApplicationCommandOptionType } from 'discord.js'
import {
  getPauseChannelNotifications,
  getPauseColorNotifications,
  setPauseChannelNotifications,
  setPauseColorNotifications,
} from '../repositories/guilds.js'

export const description = `Allows you to pause or resume a variety of automated notification messages.`
export const dmPermission = false,
  defaultMemberPermissions = false,
  options = [
    {
      name: `notification-type`,
      description: `The type of notifications you would like to pause.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `channel`, value: `Channel` },
        { name: `color`, value: `Color` },
      ],
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    notificationType = options.getString(`notification-type`)

  let toggleState

  if (notificationType === `Channel`) {
    const pauseChannelNotifications = await getPauseChannelNotifications(
      guild.id
    )

    if (pauseChannelNotifications) {
      await setPauseChannelNotifications(false, guild.id)

      toggleState = `resumed`
    } else {
      await setPauseChannelNotifications(true, guild.id)

      toggleState = `paused`
    }
  } else if (notificationType === `Color`) {
    const pauseColorNotifications = await getPauseColorNotifications(guild.id)

    if (pauseColorNotifications) {
      await setPauseColorNotifications(false, guild.id)

      toggleState = `resumed`
    } else {
      await setPauseColorNotifications(true, guild.id)

      toggleState = `paused`
    }
  }

  await interaction.editReply(
    `${notificationType} notifications have been ${toggleState}.`
  )
}
