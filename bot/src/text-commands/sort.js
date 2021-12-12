import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { setChannelSorting, setRoleSorting } from '../repositories/guilds.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import { sortChannels } from '../utils/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (
    !args ||
    ![`channels true`, `channels false`, `roles true`, `roles false`].includes(
      args.toLowerCase()
    )
  ) {
    message.reply(
      `
        Invalid input, the \`${commandSymbol}${command}\` command can only be used to sort \`channels\` or \`roles\` and can only be set to \`true\` or \`false\` 🤔\
        \nExample: \`${commandSymbol}${command} channels true\`, \`${commandSymbol}${command} roles false\`
      `
    )

    return
  }

  const argArr = args.split(` `)

  argArr[1] = argArr[1] === `true` ? true : false

  if (argArr[0].toLowerCase() === `channels`)
    await setChannelSorting(message.guild.id, argArr[1])
  else await setRoleSorting(message.guild.id, argArr[1])

  const formatedSortingType = `${argArr[0].charAt(0).toUpperCase()}${argArr[0]
    .substring(1, argArr[0].length - 1)
    .toLowerCase()}`

  if (argArr[1]) {
    message.reply(
      `${formatedSortingType} sorting has been enabled, watch em sort! 🤩`
    )

    if (argArr[0].toLowerCase === `channels`) sortChannels(message.guild.id)
  } else
    message.reply(
      `${formatedSortingType} sorting has been disabled, have fun sorting them yourself 😜`
    )
}
