import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { setNameGuidelines } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  if (!args) {
    message.reply(
      `
        Invalid input, the \`${commandSymbol}${command}\` command requires arguments 🤔\
        \nExample:\
        \n\`\`\`${commandSymbol}${command}\
          \nWe recommend setting your nickname to what people call you in real life.\
          \nwe're all on a first name basis in this server.\
        \n\`\`\`\
      `
    )

    return
  } else if (args.toLowerCase() === `null`) args = null

  await setNameGuidelines(message.guild.id, args)

  if (args)
    message.reply(
      `
      Your server's name guildlines have been set! 😁\
      \nIf you'd like to preview your name guildlines use the \`/name-guidelines\` command 👍\
    `
    )
  else message.reply(`Name guidelines have been removed from your server 😬`)
}
