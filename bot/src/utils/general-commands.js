import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Collection,
} from 'discord.js'
import moment from 'moment/moment.js'
import {
  getAllVoterChoices,
  getVoterChoices,
} from '../repositories/poll-data.js'
import {
  createPoll,
  getPollAttributes,
  getPollStartTime,
  setPollEndTime,
} from '../repositories/polls.js'
import { generateListMessage } from './slash-commands.js'
import {
  formatPercent,
  getRoleIdFromTag,
  getUserIdFromTag,
} from './validation.js'
import { getBot } from '../cache-bot.js'

export const pollTimeoutMap = new Map()

export function getEndingUnix(timeStamp, currentUnix) {
  const timeArray = timeStamp.split(`:`),
    timeObject = {}

  if (timeArray.length === 1) {
    timeObject.days = 0
    timeObject.hours = 0
    timeObject.minutes = timeArray[0]
  } else if (timeArray.length === 2) {
    timeObject.days = 0
    timeObject.hours = timeArray[0]
    timeObject.minutes = timeArray[1]
  } else {
    timeObject.days = timeArray[0]
    timeObject.hours = timeArray[1]
    timeObject.minutes = timeArray[2]
  }

  const seconds =
    timeObject.days * 86400 + timeObject.hours * 3600 + timeObject.minutes * 60

  return currentUnix + seconds
}

export async function getPollSelectPicker(pollId) {
  const pollAttributes = await getPollAttributes(pollId),
    selectValues = pollAttributes.candidates.map(cadidate => {
      return { label: cadidate, value: cadidate }
    }),
    selectPicker = new StringSelectMenuBuilder()
      .setCustomId('poll-choices')
      .setPlaceholder('click / touch here to vote')
      .setMinValues(pollAttributes.requiredChoices)
      .setMaxValues(pollAttributes.totalChoices)
      .addOptions(selectValues)

  return selectPicker
}

function getIdsFromTags(tags) {
  const userIds = [],
    roleIds = []

  tags?.forEach(tag => {
    const userId = getUserIdFromTag(tag),
      rollId = getRoleIdFromTag(tag)

    if (userId) userIds.push(userId)
    else if (rollId) roleIds.push(rollId)
  })

  return { userIds: userIds, roleIds: roleIds }
}

export async function generatePollMessage(
  interaction,
  pollDuration,
  question,
  requiredChoices,
  totalChoices,
  valueArray,
  rankedChoiceVoting,
  tags
) {
  const user = interaction.user

  let content = tags ? `${tags.join(` `)}\n\n` : ``

  content += rankedChoiceVoting
    ? `${user} started a ranked choice poll 📝`
    : `${user} started a poll 📝`

  const currentUnix = moment().unix(),
    endingUnix = getEndingUnix(pollDuration, currentUnix),
    embed = new EmbedBuilder()
      .setColor(`#CF2C2C`)
      .setTitle(question)
      .setDescription(
        `In this poll voters can select up to ${totalChoices} candidate(s) and are required to select at least ${requiredChoices} candidate(s) to vote.`
      )
      .addFields(
        { name: `Candidates`, value: valueArray.join(`\n`) },
        {
          name: `Time frame`,
          value: `This poll will automatically end <t:${endingUnix}:R>.`,
        }
      ),
    vote = new ButtonBuilder()
      .setCustomId(`!vote:`)
      .setLabel(`Vote`)
      .setStyle(ButtonStyle.Success),
    reviewMyChoices = new ButtonBuilder()
      .setCustomId(`!review-ballot:`)
      .setLabel(`Review my ballot`)
      .setStyle(ButtonStyle.Primary),
    seeCurrentResults = new ButtonBuilder()
      .setCustomId(`!see-poll-results:`)
      .setLabel(`See results`)
      .setStyle(ButtonStyle.Primary),
    firstRow = new ActionRowBuilder().addComponents(
      vote,
      reviewMyChoices,
      seeCurrentResults
    )

  let components = [firstRow]

  if (rankedChoiceVoting) {
    const rankedChoiceButton = new ButtonBuilder()
        .setLabel(`What is ranked choice voting?`)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.youtube.com/watch?v=oHRPMJmzBBw`),
      secondRow = new ActionRowBuilder().addComponents(rankedChoiceButton)

    components.push(secondRow)
  }

  const idObject = getIdsFromTags(tags)

  const pollMessage = await interaction.reply({
    content: content,
    embeds: [embed],
    components: components,
    fetchReply: true,
    allowedMentions: { users: idObject.userIds, roles: idObject.roleIds },
  })

  await createPoll(
    pollMessage.id,
    pollMessage.channel.id,
    user.id,
    currentUnix,
    endingUnix,
    question,
    valueArray,
    totalChoices,
    requiredChoices,
    rankedChoiceVoting
  )

  return { pollMessage: pollMessage, endingUnix: endingUnix }
}

export function tallyVotes(pollAttributes, voterChoices) {
  const candidates = [...pollAttributes.candidates],
    _voterChoices = [...voterChoices].map(choices => [...choices]),
    voteTally = new Collection()

  candidates.forEach(candidate => {
    voteTally.set(candidate, { votes: 0 })

    _voterChoices.forEach(voterChoice => {
      if (pollAttributes.rankedChoiceVoting) {
        const choice = voterChoice[0]

        if (choice === candidate) {
          const candidateTally = voteTally.get(candidate)

          candidateTally.votes++
        }
      } else {
        voterChoice.forEach(choice => {
          if (choice === candidate) {
            const candidateTally = voteTally.get(candidate)

            candidateTally.votes++
          }
        })
      }
    })
  })

  let totalVotes = 0

  voteTally.forEach(candidate => (totalVotes += candidate.votes))

  voteTally.forEach(candidate => {
    const percentOfVote = candidate.votes / totalVotes

    candidate.percentOfVote = formatPercent(percentOfVote)
    candidate.share = percentOfVote
  })

  const tallyDetails = { totalVotes: totalVotes, tally: voteTally }

  return tallyDetails
}

export function tallyRounds(pollAttributes, voterChoices) {
  const rounds = []

  if (!pollAttributes.rankedChoiceVoting) {
    const tallyDetails = tallyVotes(pollAttributes, voterChoices)

    rounds.push(tallyDetails)
  } else {
    let noMajority = true

    pollAttributes.candidates = new Set(pollAttributes.candidates)

    voterChoices = [...voterChoices].map(choices => new Set(choices))

    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })

    outer: while (noMajority) {
      const tallyDetails = tallyVotes(pollAttributes, voterChoices)

      rounds.push(tallyDetails)

      const majorityConsensus = tallyDetails.tally.find(
        candidate => candidate.share > 0.5
      )

      if (majorityConsensus) noMajority = false

      tallyDetails.tally.sort((a, b) => collator.compare(b.votes, a.votes))

      for (const [candidate, tally] of tallyDetails.tally) {
        if (tally.votes === 0) {
          pollAttributes.candidates.delete(candidate)

          for (let choices of voterChoices) {
            choices.delete(candidate)
          }
        }
      }

      if (pollAttributes.candidates.size <= 2) break outer

      const remainingCandidates = tallyDetails.tally.filter(
        tally => tally.votes !== 0
      )

      remainingCandidates.sort((a, b) => collator.compare(a.votes, b.votes))

      const remainingCandidatesArray = []

      for (const [candidate, tally] of remainingCandidates) {
        remainingCandidatesArray.push({
          candidate: candidate,
          votes: tally.votes,
        })
      }

      const lowestVote = remainingCandidatesArray[0].votes,
        losers = remainingCandidatesArray.filter(
          candidate => candidate.votes === lowestVote
        )

      let loser

      if (losers.length > 1) {
        const randomIndex = Math.floor(Math.random() * losers.length)

        loser = losers[randomIndex].candidate
      } else loser = losers[0].candidate

      pollAttributes.candidates.delete(loser)

      for (let choices of voterChoices) {
        choices.delete(loser)
      }
    }
  }

  return rounds
}

export async function getPollDetails(pollId) {
  const pollAttributes = await getPollAttributes(pollId)

  if (!pollAttributes) return

  const voterChoices = await getAllVoterChoices(pollId)

  if (!voterChoices) return `no voter data`

  let totalVotes = 0

  voterChoices.forEach(voterChoice => (totalVotes += voterChoice.length))

  const rounds = tallyRounds(pollAttributes, voterChoices)

  const pollDetails = {
    question: pollAttributes.question,
    totalVoters: voterChoices.length,
    totalVotes: totalVotes,
    totalChoices: pollAttributes.totalChoices,
    requiredChoices: pollAttributes.requiredChoices,
    startTime: pollAttributes.startTime,
    endTime: pollAttributes.endTime,
    rankedChoiceVoting: pollAttributes.rankedChoiceVoting,
    rounds: rounds,
  }

  return pollDetails
}

export function getTallyArray(rounds, round = 0) {
  const tallyArray = []

  for (const [candidate, tally] of rounds[round].tally) {
    tallyArray.push({ candidate: candidate, tally: tally })
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  tallyArray.sort((a, b) => collator.compare(b.tally.votes, a.tally.votes))

  return tallyArray
}

export function formatPageValue(rounds, round = 0) {
  const tallyArray = getTallyArray(rounds, round)

  let value = ``

  tallyArray.forEach((tally, index) => {
    const place = index + 1,
      candidate = tally.candidate,
      percentOfVote = tally.tally.percentOfVote,
      votes = (tally.tally.votes * 1).toLocaleString(),
      _value = `${place}. ${candidate} ${percentOfVote} (${votes} votes)`

    value += place <= 3 ? `**${_value}**\n` : `${_value}\n`
  })

  return value
}

export async function getPollPages(pollDetails) {
  if (!pollDetails || pollDetails === `no voter data`) return []

  const pages = []

  if (!pollDetails.rankedChoiceVoting) {
    const value = formatPageValue(pollDetails.rounds)

    if (value === ``) return []

    pages.push([{ name: `Results`, value: value }])
  } else {
    for (let i = 0; i < pollDetails.rounds.length; i++) {
      const value = formatPageValue(pollDetails.rounds, i)

      if (value === ``) return []

      const totalVotes = pollDetails.rounds[i].totalVotes

      pages.push([
        { name: `Round ${i + 1} results`, value: value },
        {
          name: `Count of votes`,
          value: `There were **${totalVotes}** votes cast this round.`,
        },
      ])
    }
  }

  return pages
}

export function getTimeDifference(startTime, endTime) {
  const difference = endTime - startTime

  let measurement

  if (difference >= 60 && difference < 3600) measurement = `minutes`
  else if (difference >= 3600 && difference < 86400) measurement = `hours`
  else measurement = `days`

  let shorthandMeasurement

  switch (measurement) {
    case `minutes`:
      shorthandMeasurement = `min`
      break
    case `hours`:
      shorthandMeasurement = `hr`
      break
    case `days`:
      shorthandMeasurement = `day`
      break
  }

  const startDateTime = moment.unix(startTime).format(`YYYY/MM/DD HH:mm:ss`),
    endDateTime = moment.unix(endTime).format(`YYYY/MM/DD HH:mm:ss`),
    _startDateTime = moment(new Date(startDateTime)),
    _endDateTime = moment(new Date(endDateTime))

  const _difference = _endDateTime.diff(_startDateTime, measurement)

  if (_difference > 1) shorthandMeasurement += `s`

  return `${_difference} ${shorthandMeasurement}`
}

export async function printPollResults(channelId, messageId) {
  const channel = getBot().channels.cache.get(channelId),
    message = await channel.messages.fetch(messageId),
    guild = channel.guild,
    pollDetails = await getPollDetails(message.id)

  if (!pollDetails) {
    await message.reply(`I can't seem to find the results for this poll 😬`)

    return
  }

  const reviewMyChoices = new ButtonBuilder()
      .setCustomId(`!review-ballot:`)
      .setLabel(`Review my ballot`)
      .setStyle(ButtonStyle.Primary),
    rankedChoiceButton = new ButtonBuilder()
      .setLabel(`What is ranked choice voting?`)
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.youtube.com/watch?v=oHRPMJmzBBw`),
    secondRow = new ActionRowBuilder().addComponents(rankedChoiceButton)

  let newComponents = []

  if (pollDetails.rankedChoiceVoting) newComponents.push(secondRow)

  const oldEmbed = message.embeds[0],
    startTime = await getPollStartTime(message.id),
    currentTime = moment().unix(),
    difference = getTimeDifference(startTime, currentTime),
    timeFrame = `<t:${startTime}:F> - <t:${currentTime}:F> (${difference}).`

  oldEmbed.fields[1].value = timeFrame

  if (pollDetails === `no voter data`) {
    const resultsMessage = await message.reply(
      `No one voted before the poll ended 😔`
    )

    const seeFinalResults = new ButtonBuilder()
        .setLabel(`See final results`)
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/channels/${guild.id}/${channel.id}/${resultsMessage.id}`
        ),
      firstRow = new ActionRowBuilder().addComponents(
        reviewMyChoices,
        seeFinalResults
      )

    newComponents.unshift(firstRow)

    await message.edit({
      embeds: [oldEmbed],
      components: newComponents,
    })

    return
  }

  const pages = await getPollPages(pollDetails)

  if (pages?.length === 0) {
    await message.reply(`I can't seem to find the results for this poll 😬`)

    return
  }

  const title = oldEmbed.title,
    {
      totalVoters,
      totalVotes,
      totalChoices,
      requiredChoices,
      rankedChoiceVoting,
    } = pollDetails,
    description =
      `Details: Total Voters = ${totalVoters.toLocaleString()}, Total Votes = ${totalVotes.toLocaleString()}, Ranked choice voting = ${rankedChoiceVoting}\n` +
      `Rules: In this poll voters were able to select up to ${totalChoices} candidate(s) and were required to select at least ${requiredChoices} candidate(s) to vote.`,
    page = pages[pages.length - 1]

  page.push({ name: `Time frame`, value: timeFrame })

  const listMessage = await generateListMessage(
    pages,
    title,
    description,
    `#CF2C2C`,
    pages.length
  )

  const pollMentions = message?.mentions,
    mentionedUsers = pollMentions?.users,
    mentionedRoles = pollMentions?.roles

  let resultMentions = ``

  mentionedUsers.forEach(user => (resultMentions += `${user} `))
  mentionedRoles.forEach(roles => (resultMentions += `${roles} `))

  if (resultMentions !== ``) resultMentions += `\n\n`

  let winner

  if (pollDetails.rankedChoiceVoting) {
    const rounds = pollDetails.rounds,
      tallyArray = getTallyArray(rounds, rounds.length - 1)

    winner =
      tallyArray[0].tally.share > 0.5
        ? `the winner is **${tallyArray[0].candidate}** 👑`
        : `the poll was inconclusive 😲` +
          `\n\n In a ranked choice poll a winner can only be declared if they won over 50% of the votes.`

    const seeFullResults = new ButtonBuilder()
        .setCustomId(`!see-poll-results: ${message.id}`)
        .setLabel(`See full results`)
        .setStyle(ButtonStyle.Primary),
      firstRow = new ActionRowBuilder().addComponents(
        seeFullResults,
        rankedChoiceButton
      )

    listMessage.components = [firstRow]
  } else {
    const tallyArray = getTallyArray(pollDetails.rounds)

    winner =
      tallyArray[0].tally.votes > tallyArray[1].tally.votes
        ? `the winner is **${tallyArray[0].candidate}** 👑`
        : `there was a tie 😲`

    listMessage.components = []
  }

  listMessage.content = `${resultMentions}The numbers are in, ${winner}`

  const resultsMessage = await message.reply(listMessage)

  const seeFinalResults = new ButtonBuilder()
      .setLabel(`See final results`)
      .setStyle(ButtonStyle.Link)
      .setURL(
        `https://discord.com/channels/${guild.id}/${channel.id}/${resultsMessage.id}`
      ),
    firstRow = new ActionRowBuilder().addComponents(
      reviewMyChoices,
      seeFinalResults
    )

  newComponents.unshift(firstRow)

  message.edit({
    embeds: [oldEmbed],
    components: newComponents,
  })

  const timeOutId = pollTimeoutMap.get(message.id)

  await setPollEndTime(message.id, currentTime)

  clearTimeout(timeOutId)

  pollTimeoutMap.delete(message.id)
}
