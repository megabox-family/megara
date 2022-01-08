import { getCommandName, adminCheck } from '../utils/text-commands.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  message.reply(`nice`)
}
