import { ApplicationCommandOptionType } from 'discord.js'
import {
  getServerSubscriptionButtonText,
  setServerSubscriptionButtonText,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to set the display text of the server subscription button.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `button-text`,
      description: `The text you'd like the button to display (input 'null' to clear).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    options = interaction.options

  let newButtonText = options.getString(`button-text`)

  if (newButtonText === `null`) newButtonText = null

  await setServerSubscriptionButtonText(guild.id, newButtonText)

  const buttonText = await getServerSubscriptionButtonText(guild.id)

  if (buttonText === null) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The server subscription button text has been cleared 🧼`,
    })
  } else {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `The server subscription button text has been set to:` +
        `\n> ${buttonText}`,
    })
  }
}
