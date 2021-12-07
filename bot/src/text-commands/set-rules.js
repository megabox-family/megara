import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import { setRules } from '../repositories/guilds.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (!args) {
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

  message.reply(
    `
      Your server's rules have been set! 😁\
      \nIf you'd like to preview your rules use the \`!rules\` command 👍
    `
  )
}
