import { ApplicationCommandOptionType } from 'discord.js'

export const description = `Lets you roll dice and returns the result.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `number-of-dice`,
      description: `The number of dice you would like to roll.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 1,
      maxValue: 1000,
    },
    {
      name: `number-of-sides`,
      description: `The count of sides you want the dice to have.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 1,
      maxValue: 1000,
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
    numberOfDice = options.getInteger(`number-of-dice`),
    numberOfSides = options.getInteger(`number-of-sides`)

  let makePrivate = options.getBoolean(`make-private`)

  makePrivate = makePrivate === null ? false : true

  await interaction.deferReply({ ephemeral: makePrivate })

  let total = 0
  let rolls = []

  for (let i = 0; i < numberOfDice; i++) {
    const result = Math.floor(Math.random() * numberOfSides) + 1
    total += result
    rolls.push(result)
  }

  const _rolls = rolls.join(', ')

  await interaction.editReply({
    content: `${numberOfDice} dice with ${numberOfSides} sides were rolled... \`\`\`md\n# Total: ${total}\nIndividual dice: (${_rolls})\`\`\``,
    ephemeral: makePrivate,
  })
}
