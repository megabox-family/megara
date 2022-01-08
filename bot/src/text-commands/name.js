import { logErrorMessageToChannel } from '../utils/general.js'
import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import {
  getVerificationChannel,
  getWelcomeChannel,
} from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

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
    verificationChannelId = await getVerificationChannel(guild.id)

  if (channel.id !== verificationChannelId)
    if (!(await commandLevelCheck(message, commandSymbol, command))) return

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

  let newNickname = nickname.toLowerCase(),
    failed = false
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
    failed = true
    handleNicknameFailure(error, guild)

    message.reply(
      `Sorry I wasn't able to change your nickname, you may have a role that is above mine, which prevents me from doing so.`
    )
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
    failed = true
    handleNicknameFailure(error, guild)

    message.reply(
      `Sorry I wasn't able to change your nickname, you may have a role that is above mine, which prevents me from doing so.`
    )
  }

  const undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    ).id,
    userUndergoingVerificationRole = guildMember.roles.cache.find(
      role => role.id === undergoingVerificationRoleId
    ),
    welcomeChannelId = await getWelcomeChannel(guild.id)

  if (userUndergoingVerificationRole) {
    if (welcomeChannelId)
      await message.reply(
        `\
        \nCongratulations! 🎉\
        \nYour nickname has been changed to ${newNickname}, and you've been fully verified!\
        \nI'd recommend checking out the <#${welcomeChannelId}> channel for more information on what to do next.\
      `
      )
    else
      await message.reply(
        `\
      \nCongratulations! 🎉\
      \nYour nickname has been changed to ${newNickname}, and you've been fully verified!\
      \nThis server doesn't have a welcome channel officially set, so if I were you I'd just take a look around 👀\
    `
      )

    guildMember.roles.remove(undergoingVerificationRoleId)
  } else if (!failed) {
    message.reply(`Your nickname has been changed to ${newNickname} 🥰`)
  }
}
