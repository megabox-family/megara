import { getCommandLevelForChannel } from '../repositories/channels.js'
import { setRules } from '../repositories/guilds.js'

export default async function (message, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`!setRules\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (!args) {
    message.reply(
      `
        Invalid input, the \`!setRules\` command requires arguments 🤔\
        \nExample:\
        \n\`\`\`!setRules\
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
