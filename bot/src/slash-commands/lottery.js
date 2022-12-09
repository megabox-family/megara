import { ApplicationCommandOptionType } from 'discord.js'
import { commasFollowedBySpace } from '../utils/validation.js'

export const description = `Takes a comma deliminted list of values and returns one of said values at random.`
export const dmPermission = true,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `values`,
      description: `A list of 2 or more comma delimited values.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `make-private`,
      description: `If true, only you will see the result. If false or left blank, others can see the result.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction) {
  const options = interaction.options,
    values = options.getString(`values`),
    commaDelimitedList = values.replaceAll(commasFollowedBySpace, `,`)

  let valueArray = commaDelimitedList.split(`,`)

  valueArray = valueArray.filter(value => value !== ``)

  if (valueArray.length < 2) {
    await interaction.reply({
      content: `You must provide a comma delimited list with 2 or more values 🤔`,
      ephemeral: true,
    })

    return
  }

  let makePrivate = options.getBoolean(`make-private`)

  makePrivate = makePrivate === null ? false : true

  await interaction.deferReply({ ephemeral: makePrivate })

  const randomIndex = Math.floor(Math.random() * valueArray.length),
    lotteryWinner = valueArray[randomIndex]

  await interaction.editReply(`The lottery winner is ${lotteryWinner} 🎟️`)
}
