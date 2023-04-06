import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

export function getCommandName(fileUrl) {
  return camelize(basename(fileURLToPath(fileUrl), '.js'))
}

export async function adminCheck(message, commandSymbol, command) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `Sorry, \`${commandSymbol}${command}\` is not a valid command 😔` +
        `\nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰`
    )

    return false
  }

  return true
}

export async function cinemaCheck(message, commandSymbol, command) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if (commandLevel !== `cinema`) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `cinema`
    )

    message.reply(
      `Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔` +
        `\nBut here's a list of channels you can use it in: ${commandChannels}`
    )

    return false
  }

  return true
}

export async function commandLevelCheck(message, commandSymbol, command) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if (![`admin`, `unrestricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `unrestricted`
    )

    message.reply(
      `Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔` +
        `\nBut here's a list of channels you can use it in: ${commandChannels}`
    )

    return false
  }

  return true
}
