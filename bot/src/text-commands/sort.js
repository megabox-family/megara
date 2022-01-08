import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { pushToChannelSortingQueue } from '../utils/channels.js'
import { pushToRoleSortingQueue } from '../utils/roles.js'
import { setChannelSorting, setRoleSorting } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  if (
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

  const guild = message.guild,
    argArr = args.split(` `)

  argArr[1] = argArr[1] === `true` ? true : false

  if (argArr[0].toLowerCase() === `channels`)
    await setChannelSorting(guild.id, argArr[1])
  else await setRoleSorting(guild.id, argArr[1])

  const formatedSortingType = `${argArr[0].charAt(0).toUpperCase()}${argArr[0]
    .substring(1, argArr[0].length - 1)
    .toLowerCase()}`

  if (argArr[1]) {
    message.reply(
      `${formatedSortingType} sorting has been enabled, watch em sort! 🤩`
    )

    if (argArr[0].toLowerCase() === `channels`)
      pushToChannelSortingQueue(guild.id)
    else pushToRoleSortingQueue(guild.id)
  } else
    message.reply(
      `${formatedSortingType} sorting has been disabled, have fun sorting them yourself 😜`
    )
}
