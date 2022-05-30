import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { getWelcomeChannel } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  message.reply(`Wow, did you even know what you're trying to do?`)
}
