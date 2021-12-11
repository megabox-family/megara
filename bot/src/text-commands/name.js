import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { logErrorMessageToChannel } from '../utils/general.js'
import { getVerificationChannel } from '../repositories/guilds.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

function isNicknameValid(nickname, allowedSymbols) {
  if (nickname.match(`^[A-Za-z]+$`)) return true
  if (nickname.length > 32) return false

  const charArr = nickname.split('')
  let lastValue

  return !charArr.find((currentValue, index) => {
    if (allowedSymbols.includes(currentValue) && index === 0) return true
    else if (currentValue === ' ' && !lastValue.match(`^[A-Za-z]$|^[.]$`))
      return true
    else if (
      ['-', "'", '.'].includes(currentValue) &&
      !lastValue.match(`^[A-Za-z]$`)
    )
      return true
    else if (currentValue.match(`^[A-Za-z]$`) && lastValue === `.`) return true
    else if (
      ![' ', '-', "'", '.'].includes(currentValue) &&
      !currentValue.match(`^[A-Za-z]$`)
    )
      return true

    lastValue = currentValue
  })
}

const handleNicknameFailure = (err, guild) => {
  console.log(err)
  logErrorMessageToChannel(err.message, guild)
}

const timeout = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async function (message, commandSymbol, nickname) {
  const guild = message.guild,
    channel = message.channel,
    commandLevel = await getCommandLevelForChannel(channel.id),
    verificationChannelId = await getVerificationChannel(guild.id)

  if (
    [`prohibited`, `restricted`].includes(commandLevel) &&
    channel.id !== verificationChannelId
  ) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `unrestricted`
    )

    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔\
        \nBut here's a list of channels you can use it in: ${commandChannels}
      `
    )

    return
  }

  if (!nickname) {
    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command requires a name following the command (ex: \`${commandSymbol}${command} John\`) 😔\
      `
    )

    return
  }

  const allowedSymbols = [' ', '-', "'", '.']

  if (!isNicknameValid(nickname, allowedSymbols)) {
    const allowedSymbolList = allowedSymbols.join(`\`, \``)

    message.reply(
      `
        Sorry, names must be below 32 characters and cannot contain numbers or most special characters. 😔\
        \nHere's a list of acceptable special characters: \`${allowedSymbolList}\` (not including commas)\
        \nAllowed special characters cannot be repeating, and spaces must follow periods.\
        \nExample: \`${commandSymbol}${command} Jason\`, \`${commandSymbol}${command} Chris W.\`, \`${commandSymbol}${command} Dr. White\`, \`${commandSymbol}${command} Brett-Anne\`, \`${commandSymbol}${command} O'Brien\`
      `
    )

    return
  }

  let newNickname = nickname.toLowerCase()
  const guildMember = guild.members.cache.get(message.author.id)

  allowedSymbols.forEach(symbol => {
    newNickname = newNickname
      .split(symbol)
      .map(x => x.charAt(0).toUpperCase() + x.substring(1))
      .join(symbol)
  })

  await guild.members.fetch()

  // Attempt to set nickname
  try {
    let nicknameIsUpdated = false
    let attempts = 0

    while (!nicknameIsUpdated) {
      if (newNickname === message.author.username) {
        nicknameIsUpdated = true
      }

      await Promise.all([guildMember.setNickname(newNickname), timeout(1000)])

      let updatedNickname = await guildMember.nickname

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
    const verifiedRole = guild.roles.cache.find(
      role => role.name === `verified`
    )
    let roleIsUpdated = false
    let attempts = 0

    while (!roleIsUpdated) {
      await Promise.all([guildMember.roles.add(verifiedRole.id), timeout(1000)])

      roleIsUpdated = await guildMember.roles.cache.some(
        x => x.id === verifiedRole.id
      )

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

  const undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ).id,
    userUndergoingVerificationRole = guildMember.roles.cache.find(
      role => role.id === undergoingVerificationRoleId
    )

  if (userUndergoingVerificationRole) {
    message.reply(
      `\
        \nCongratulations! 🎉\
        \nYour nickname has been changed to ${newNickname}, and you've been fully verified!\
        \nI'd reccomend checking out ${guild.name}'s welcome channel for more information on what to do next.\

        \nHeads up, you'll be removed from the <#${verificationChannelId}> channel in 30 seconds, have fun in ${guild.name}!\
      `
    )

    setTimeout(
      () => guildMember.roles.remove(undergoingVerificationRoleId),
      30000
    )
  } else {
    message.reply(`Your nickname has been changed to ${newNickname} 🥰`)
  }
}
