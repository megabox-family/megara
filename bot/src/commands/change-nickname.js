import { getIdForRole } from '../repositories/roles.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import { formatReply, logErrorMessageToChannel } from '../utils.js'
import validator from 'validator'

const { isAlpha } = validator

const isNicknameValid = nickname => {
  return isAlpha(nickname) || nickname.split(/[\s-.']+/).every(x => isAlpha(x))
}

const handleNicknameFailure = (err, guild) => {
  console.log(err)
  logErrorMessageToChannel(err.message, guild)
}

const timeout = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async function (nickname, { message, guild, isDirectMessage }) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  if (isNicknameValid(nickname)) {
    const allowedSymbols = [' ', '-', "'", '.']
    let newNickname = nickname.toLowerCase()

    allowedSymbols.forEach(symbol => {
      newNickname = newNickname
        .split(symbol)
        .map(x => x.charAt(0).toUpperCase() + x.substring(1))
        .join(symbol)
    })

    const verifiedRoleId = await getIdForRole('verified')
    if (!verifiedRoleId)
      return logErrorMessageToChannel(
        "Could not fetch 'verified' role id",
        guild
      )

    await guild.members.fetch()

    // Attempt to set nickname
    try {
      let nicknameIsUpdated = false
      let attempts = 0

      while (!nicknameIsUpdated) {
        await Promise.all([
          guild.members.cache.get(message.author.id).setNickname(newNickname),
          timeout(1000),
        ])

        let updatedNickname = await guild.members.cache.get(message.author.id)
          .nickname

        nicknameIsUpdated = updatedNickname === newNickname

        if (!nicknameIsUpdated) {
          attempts++
          logErrorMessageToChannel(
            `Failed to update nickname after ${attempts} second(s), retrying...`,
            guild
          )
        }
      }
    } catch (error) {
      handleNicknameFailure(error, guild)
    }

    // Attempt to set verified role
    try {
      let roleIsUpdated = false
      let attempts = 0

      while (!roleIsUpdated) {
        await Promise.all([
          guild.members.cache.get(message.author.id).roles.add(verifiedRoleId),
          timeout(1000),
        ])

        roleIsUpdated = await guild.members.cache
          .get(message.author.id)
          .roles.cache.some(x => x.id === verifiedRoleId)

        if (!roleIsUpdated) {
          attempts++
          logErrorMessageToChannel(
            `Failed to update role after ${attempts} second(s), retrying...`,
            guild
          )
        }
      }
    } catch (error) {
      handleNicknameFailure(error, guild)
    }

    message.reply(
      formatReply(
        `your nickname has been changed to ${newNickname} ^-^`,
        isDirectMessage
      )
    )
  } else
    message.reply(
      formatReply(
        "your nickname can't have any special characters!",
        isDirectMessage
      )
    )
}
