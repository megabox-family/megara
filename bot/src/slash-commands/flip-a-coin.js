import { ApplicationCommandOptionType } from 'discord.js'

export const description = `Flips a coin and displays the result`
export const dmPermission = false,
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

  await interaction.deferReply({ ephemeral: makePrivate })

  const headsOrTails = Math.round(Math.random()) === 1 ? `heads` : `tails`

  await interaction.editReply(
    `🪙 \n\n👍 🫴 🫳 \n\nThe coin landed on **${headsOrTails}**.`
  )
}
