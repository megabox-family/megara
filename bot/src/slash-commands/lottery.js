import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { extractElement, formatNumber } from '../utils/general.js'
import { getNicknameOrUsername } from '../utils/members.js'
import { commasFollowedBySpace } from '../utils/validation.js'

export const description = `Takes a comma deliminted list of values and returns one of said values at random.`
export const dmPermission = true,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `candidates`,
      description: `A list of 2 or more comma delimited values.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `number-of-winners`,
      description: `The possible number of winners.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
    },
    {
      name: `make-private`,
      description: `If true, only you will see the result. If false or left blank, others can see the result.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction) {
  const { options, member, user } = interaction,
    candidates = options.getString(`candidates`),
    commaDelimitedList = candidates.replaceAll(commasFollowedBySpace, `,`)

  let candidateArray = commaDelimitedList.split(`,`)
  candidateArray = candidateArray.filter(value => value !== ``)

  const candidateCount = candidateArray?.length

  if (candidateCount < 2) {
    await interaction.reply({
      content: `You must provide a comma delimited list with 2 or more values 🤔`,
      ephemeral: true,
    })

    return
  }

  let numberOfWinners = options.getInteger(`number-of-winners`)
  numberOfWinners = numberOfWinners ? numberOfWinners : 1

  if (numberOfWinners >= candidateCount) {
    const _numberOfWinners = formatNumber(numberOfWinners),
      _candidateCount = formatNumber(candidateCount)

    await interaction.reply({
      content: `The number of winners (${_numberOfWinners}) cannot exceed the number of values (${_candidateCount}) 🤔`,
      ephemeral: true,
    })

    return
  }

  let makePrivate = options.getBoolean(`make-private`)
  makePrivate = makePrivate === null ? false : true

  await interaction.deferReply({ ephemeral: makePrivate })

  const winners = []

  let diminishingCandidates = JSON.parse(JSON.stringify(candidateArray))

  for (let i = 0; i < numberOfWinners; i++) {
    const randomIndex = Math.floor(
        Math.random() * diminishingCandidates?.length
      ),
      { array, element: winner } = extractElement(
        diminishingCandidates,
        randomIndex
      )

    diminishingCandidates = array

    console.log(winner)

    winners.push(winner)
  }

  let winnerPlurality = `winner`,
    winnerList = winners[0]

  if (numberOfWinners > 1) {
    winnerPlurality = `winners`
    winnerList = ``

    winners.forEach((winner, index) => {
      const position = index + 1

      winnerList += `${position}. ${winner}\n`
    })
  }

  const userName = getNicknameOrUsername(member, user),
    candidateList = candidateArray.join(`, `),
    embed = new EmbedBuilder()
      .setColor(`#1AB85A`)
      .setTitle(`${userName} ran a lottery 🎟️`)
      .addFields(
        { name: winnerPlurality, value: winnerList },
        { name: `candidates`, value: `(${candidateList})` },
        { name: `possible number of winners`, value: `${numberOfWinners}` }
      )
      .setTimestamp()

  await interaction.editReply({ embeds: [embed] })
}
