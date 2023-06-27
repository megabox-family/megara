import { ApplicationCommandOptionType } from 'discord.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Flips a coin and displays the result`
export const dmPermission = true,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `make-private`,
      description: `If true, only you will see the result. If false or left blank, others can see the result.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction) {
  const options = interaction.options

  let makePrivate = options.getBoolean(`make-private`)

  makePrivate = makePrivate === null ? false : true

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: makePrivate },
  })

  const headsOrTails = Math.round(Math.random()) === 1 ? `heads` : `tails`

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `🪙 \n\n👍 🫴 🫳 \n\nThe coin landed on **${headsOrTails}**.`,
  })
}
