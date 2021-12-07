import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getBot } from '../cache-bot.js'
import { logErrorMessageToChannel } from '../utils/general.js'
import { getRoleByName } from '../utils/roles.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

function isNicknameValid(nickname, allowedSymbols) {
  if (nickname.match(`^[A-Za-z]+$`)) return true

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
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
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
        Sorry, names cannot contain numbers or most special characters. 😔\
        \nHere's a list of acceptable special characters: \`${allowedSymbolList}\` (not including commas)\
        \nAllowed special characters cannot be repeating, and spaces must follow periods.\
        \nExample: \`${commandSymbol}${command} Jason\`, \`${commandSymbol}${command} Chris W.\`, \`${commandSymbol}${command} Dr. White\`, \`${commandSymbol}${command} Brett-Anne\`, \`${commandSymbol}${command} O'Brien\`
      `
    )

    return
  }

  const guild = getBot().guilds.cache.get(message.guild.id)
  let newNickname = nickname.toLowerCase()

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
    const verifiedRole = await getRoleByName(message.guild.id, `verified`)
    let roleIsUpdated = false
    let attempts = 0

    while (!roleIsUpdated) {
      await Promise.all([
        guild.members.cache.get(message.author.id).roles.add(verifiedRole.id),
        timeout(1000),
      ])

      roleIsUpdated = await guild.members.cache
        .get(message.author.id)
        .roles.cache.some(x => x.id === verifiedRole.id)

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

  message.reply(`Your nickname has been changed to ${newNickname} 🥰`)
}
