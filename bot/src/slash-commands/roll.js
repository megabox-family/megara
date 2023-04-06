import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { getNicknameOrUsername } from '../utils/members.js'

export const description = `Lets you roll dice and returns the result.`
export const dmPermission = true,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `number-of-dice`,
      description: `The number of dice you would like to roll.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 100,
    },
    {
      name: `number-of-sides`,
      description: `The count of sides you want the dice to have.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 2,
      maxValue: 10000,
    },
    {
      name: `make-private`,
      description: `If true, only you will see the result. If false or left blank, others can see the result.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

function formatNumber(number) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(number)
}

export default async function (interaction) {
  const { options, member, user } = interaction

  let numberOfDice = options.getInteger(`number-of-dice`),
    numberOfSides = options.getInteger(`number-of-sides`)

  numberOfDice = numberOfDice ? numberOfDice : 1
  numberOfSides = numberOfSides ? numberOfSides : 100

  let makePrivate = options.getBoolean(`make-private`)

  makePrivate = makePrivate === null ? false : true

  await interaction.deferReply({ ephemeral: makePrivate })

  let total = 0
  let rolls = []

  for (let i = 0; i < numberOfDice; i++) {
    const result = Math.floor(Math.random() * numberOfSides) + 1
    total += result
    rolls.push(formatNumber(result))
  }

  const _numberOfSides = formatNumber(numberOfSides),
    _total = formatNumber(total),
    messageObject = { ephemeral: makePrivate }

  if (numberOfDice === 1) {
    messageObject.content = `*A ${_numberOfSides} sided 🎲 was rolled and landed on __**${_total}**__*...`
  } else {
    const userName = getNicknameOrUsername(member, user),
      _numberOfDice = formatNumber(numberOfDice),
      average = formatNumber(total / numberOfDice),
      _rolls = rolls.join(', '),
      embed = new EmbedBuilder()
        .setColor(`#B81E1E`)
        .setTitle(
          `${userName} rolled ${_numberOfDice} 🎲 with ${_numberOfSides} sides...`
        )
        .addFields(
          { name: `total`, value: _total },
          { name: `average`, value: average },
          {
            name: `individual rolls`,
            value: `(${_rolls})`,
          }
        )
        .setTimestamp()

    messageObject.embeds = [embed]
  }

  await interaction.editReply(messageObject)
}
