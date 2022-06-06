import { getCommandName, adminCheck } from '../utils/text-commands.js'
import { setRules } from '../repositories/guilds.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await adminCheck(message, commandSymbol, command))) return

  if (!args) {
    message.reply(
      `
        Invalid input, the \`${commandSymbol}${command}\` command requires arguments 🤔\
        \nExample:\
        \n\`\`\`${commandSymbol}${command}\
          \nTo continue you must accept [server names] rules\
          \n- No kicking\
          \n- No screamin\
          \n...\
        \n\`\`\`\
      `
    )

    return
  } else if (args.toLowerCase() === `null`) args = null

  await setRules(message.guild.id, args)

  if (args)
    message.reply(`
      \nYour server's rules have been set! 😁\
      \nIf you'd like to preview your rules use the \`/rules\` command 👍
    `)
  else message.reply(`Rules have been removed from your server 😬`)
}
