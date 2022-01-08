import { validCommandSymbols } from '../utils/general.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'
import {
  setCommandSymbol,
  getAnnouncementChannel,
} from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  const guild = message.guild,
    commandSymbolsString = validCommandSymbols.join('`, `')

  if (!validCommandSymbols.includes(args)) {
    message.reply(
      `\
        \n${args} is not a valid command symbol 🤔\
        \nHere's a list of valid command symbols: \`${commandSymbolsString}\` (not including comma)
      `
    )

    return
  }

  await setCommandSymbol(guild.id, args)

  message.reply(`\`${args}\` has been set as the new command symbol!`)

  const announcementChannelId = await getAnnouncementChannel(guild.id),
    announcementChannel = guild.channels.cache.get(announcementChannelId)

  announcementChannel.send(
    `\
      \n@everyone\
      \nThe command symbol for my commands in this server has been changed to \`${args}\` 🤗
      \nThis means that all my commands will now start with \`${args}\`, ex: \`${args}roll 1d6\`
    `
  )
}
