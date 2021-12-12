import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getAllVoiceChannelIds } from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, numberOfTeams) {
  if (!numberOfTeams || !numberOfTeams.match(`^[2-9]$|^[1-9][0-9]+$`)) {
    message.reply(
      `Invalid input, the value following \`${commandSymbol}${command}\` must be a number greater than 1 (ex: \`${commandSymbol}${command} 2\`) 🤔`
    )

    return
  }

  const guild = message.guild,
    voiceChannelIds = await getAllVoiceChannelIds(guild.id),
    voiceChannels = voiceChannelIds.map(voiceChannelId =>
      guild.channels.cache.get(voiceChannelId)
    ),
    voiceChannelMemberNames = voiceChannels
      .find(voiceChannel => voiceChannel.members.get(message.author.id))
      ?.members.map(voiceChannelMember => {
        const user = voiceChannelMember.user

        return voiceChannelMember?.nickname
          ? `${voiceChannelMember.nickname} (${user.username}#${user.discriminator})`
          : `${user.username} (#${user.discriminator})`
      }),
    teams = []

  if (!voiceChannelMemberNames) {
    message.reply(
      `You must be in a call to use the \`${commandSymbol}${command}\` command 🤔`
    )

    return
  } else if (voiceChannelMemberNames.length < 2) {
    message.reply(
      `You need at least 2 people in a call to use the \`${commandSymbol}${command}\` command 🤔`
    )

    return
  } else if (voiceChannelMemberNames.length < numberOfTeams)
    voiceChannelMemberNames.forEach(() => teams.push([]))
  else
    for (let i = 0; i < numberOfTeams; i++) {
      teams.push([])
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

  let replyMessage = `Good luck everyone! 🍀\n\n`

  teams
    .filter(team => team.length !== 0)
    .forEach((team, index) => {
      replyMessage += `**Team ${index + 1}**\n${team.join(`\n`)}\n\n`
    })

  message.reply(replyMessage)
}
