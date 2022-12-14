import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'
import moment from 'moment/moment.js'
import {
  pollTimeoutMap,
  generatePollMessage,
  printPollResults,
} from '../utils/general-commands.js'
import {
  commasFollowedBySpace,
  formatQuestion,
  validateTagArray,
  validateTimeStamp,
} from '../utils/validation.js'

export const description = `Allows you to run a poll with various options.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `poll-duration`,
      description: `The duration in-which the poll should run (days:hours:minutes [dd:hh:mm], ex: 7:00:00, 1:00, 15).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `question`,
      description: `The question that you're posing.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `candidates`,
      description: `A comma delimited list of values that will be individually selectable by voters (25 max).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `total-choices`,
      description: `The total ammount of choices each voter can select.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
    {
      name: `required-choices`,
      description: `The required amount of choices voters must select.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
    {
      name: `ranked-choice-voting`,
      description: `Choose whether the poll should be ranked choice or not.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `tags`,
      description: `Comma delimited list of tags to tag users/roles in the poll message and results.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `sort-values`,
      description: `Sort the values when listed in the poll.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction) {
  const user = interaction.user,
    options = interaction.options,
    pollDuration = options.getString(`poll-duration`)

  if (!validateTimeStamp(pollDuration)) {
    await interaction.reply({
      content: `You provided an invalid timestamp 😤`,
      ephemeral: true,
    })

    return
  }

  const candidates = options.getString(`candidates`),
    commaDelimitedList = candidates.replaceAll(commasFollowedBySpace, `,`)

  let valueArray = commaDelimitedList.split(`,`)

  valueArray = valueArray?.filter(value => value !== ``)
  valueArray = valueArray?.map(value => value.trim())

  if (valueArray.length < 2) {
    await interaction.reply({
      content: `You must provide a comma delimited list with 2 or more values 🤔`,
      ephemeral: true,
    })

    return
  } else if (valueArray.length > 25) {
    await interaction.reply({
      content: `You can only provide up to 25 options for a poll and you provided ${valueArray.length} 😤`,
      ephemeral: true,
    })

    return
  }

  let question = options.getString(`question`),
    totalChoices = options.getInteger(`total-choices`),
    requiredChoices = options.getInteger(`required-choices`),
    rankedChoiceVoting = options.getBoolean(`ranked-choice-voting`)

  question = formatQuestion(question)

  totalChoices = totalChoices ? totalChoices : 1
  totalChoices =
    totalChoices > valueArray.length ? valueArray.length : totalChoices
  requiredChoices = requiredChoices ? requiredChoices : 1
  requiredChoices =
    requiredChoices > totalChoices ? totalChoices : requiredChoices
  rankedChoiceVoting = rankedChoiceVoting !== null ? rankedChoiceVoting : false

  if (rankedChoiceVoting && totalChoices === 1) {
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(`What is ranked choice voting?`)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.youtube.com/watch?v=oHRPMJmzBBw`)
    )

    await interaction.reply({
      content: `You enabled ranked choice voting but only allowed people to select one choice 🤔`,
      components: [button],
      ephemeral: true,
    })

    return
  }

  const tags = options.getString(`tags`),
    commaDelimitedTags = tags?.replaceAll(commasFollowedBySpace, `,`)

  let tagArray = commaDelimitedTags?.split(`,`)

  tagArray = tagArray?.filter(tag => tag !== ``)
  tagArray = tagArray?.map(tag => tag.trim())

  const goodTags = tagArray ? validateTagArray(tagArray) : true

  if (!goodTags) {
    await interaction.reply({
      content: `You provided an invalid tag 🤔`,
      ephemeral: true,
    })

    return
  }

  let sortValues = options.getBoolean(`sort-values`)

  sortValues = sortValues !== null ? sortValues : false

  if (sortValues) {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })

    valueArray.sort((a, b) => collator.compare(a, b))
  }

  const { pollMessage, endingUnix } = await generatePollMessage(
      interaction,
      pollDuration,
      question,
      requiredChoices,
      totalChoices,
      valueArray,
      rankedChoiceVoting,
      tagArray
    ),
    currentUnix = moment().unix(),
    millisecondDifference = (endingUnix - currentUnix) * 1000

  const timeoutId = setTimeout(
    printPollResults.bind(null, pollMessage.channel.id, pollMessage.id),
    millisecondDifference
  )

  pollTimeoutMap.set(pollMessage.id, timeoutId)
}
