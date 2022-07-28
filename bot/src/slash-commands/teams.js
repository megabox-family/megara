import { getAllVoiceChannelIds } from '../repositories/channels.js'

export const description = `Creates a sepcificed number of randomized teams composed of people in the voice channel you're in.`
export const dmPermission = false,
  options = [
    {
      name: `number-of-teams`,
      description: `The number of teams you'd like to divy people into.`,
      type: `INTEGER`,
      required: true,
      minValue: 2,
      maxValue: 1000,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    voiceChannelIds = await getAllVoiceChannelIds(guild.id),
    voiceChannels = voiceChannelIds.map(voiceChannelId =>
      guild.channels.cache.get(voiceChannelId)
    ),
    voiceChannelMemberNames = voiceChannels
      .find(voiceChannel => voiceChannel.members.get(interaction.member.id))
      ?.members.map(voiceChannelMember => {
        const user = voiceChannelMember.user

        return voiceChannelMember?.nickname
          ? `${voiceChannelMember.nickname} (${user.username}#${user.discriminator})`
          : `${user.username} (#${user.discriminator})`
      }),
    options = interaction.options,
    numberOfTeams = options.getInteger(`number-of-teams`),
    teams = []

  if (!voiceChannelMemberNames) {
    await interaction.reply({
      content: `You must be in a call to use the \`/teams\` command 🤔`,
      ephemeral: true,
    })

    return
  } else if (voiceChannelMemberNames.length < 2) {
    await interaction.reply({
      content: `You need at least 2 people in a call to use the \`/teams\` command 🤔`,
      ephemeral: true,
    })

    return
  } else if (voiceChannelMemberNames.length < numberOfTeams) {
    await interaction.deferReply()

    voiceChannelMemberNames.forEach(() => teams.push([]))
  } else {
    await interaction.deferReply()

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

  let replyMessage = 'Good luck everyone! 🍀\n```'

  teams
    .filter(team => team.length !== 0)
    .forEach((team, index) => {
      replyMessage += `**Team ${index + 1}**\n${team.join(`\n`)}\n\n`
    })

  replyMessage += '```'

  await interaction.editReply(replyMessage)
}
