import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { extractElement } from '../utils/general.js'
import { checkIfChannelIsSuggestedType } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Adds the specified role to all users in the server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `number-of-teams`,
      description: `The number of teams you'd like to divy people into.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 2,
      maxValue: 10,
    },
  ]

export default async function (interaction) {
  const { guild, options } = interaction,
    voiceChannels = guild.channels.cache.filter(channel =>
      checkIfChannelIsSuggestedType(channel, `voice`)
    ),
    voiceChannelMemberNames = voiceChannels
      .find(voiceChannel => voiceChannel.members.get(interaction.member.id))
      ?.members.map(voiceChannelMember => {
        const user = voiceChannelMember.user,
          { id: userId } = user

        return `<@${userId}>`
      }),
    numberOfTeams = options.getInteger(`number-of-teams`),
    teams = []

  if (!voiceChannelMemberNames) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You must be in a call to use the \`/teams\` command 🤔`,
        ephemeral: true,
      },
    })

    return
  } else if (voiceChannelMemberNames.length < 2) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: `You need at least 2 people in a call to use the \`/teams\` command 🤔`,
    })

    return
  } else if (voiceChannelMemberNames.length < numberOfTeams) {
    await queueApiCall({
      apiCall: `deferReply`,
      djsObject: interaction,
    })

    voiceChannelMemberNames.forEach(() => teams.push([]))
  } else {
    await queueApiCall({
      apiCall: `deferReply`,
      djsObject: interaction,
    })

    for (let i = 0; i < numberOfTeams; i++) {
      teams.push([])
    }
  }

  while (voiceChannelMemberNames.length > 0) {
    teams.forEach(team => {
      if (voiceChannelMemberNames.length === 0) return

      const randomIndex = Math.floor(
        Math.random() * voiceChannelMemberNames.length
      )

      team.push(voiceChannelMemberNames[randomIndex])

      voiceChannelMemberNames.splice(randomIndex, 1)
    })
  }

  let diminishingTeamNames = JSON.parse(JSON.stringify(teamsNames))

  const _teams = teams.filter(team => team.length !== 0),
    teamFields = _teams.map(team => {
      const randomIndex = Math.floor(
          Math.random() * diminishingTeamNames?.length
        ),
        { array, element: teamName } = extractElement(
          diminishingTeamNames,
          randomIndex
        )

      diminishingTeamNames = array

      const teamMembers = team.join(`\n`)

      return { name: teamName, value: teamMembers }
    })

  const embed = new EmbedBuilder()
    .setColor(`#6725BC`)
    .setTitle(`avengers asemble 🫡`)
    .addFields(teamFields)
    .setFooter({ text: `good luck everyone 🍀` })
    .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { embeds: [embed] },
  })
}
