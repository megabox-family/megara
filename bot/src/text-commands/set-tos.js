import { getCommandLevelForChannel } from '../repositories/channels.js'
import { setTosMessage } from '../repositories/guilds.js'

export default async function (message, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`!settos\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (!args) {
    message.reply(
      `
        Invalid input, the \`!settos\` command requires arguments 🤔\
        \nExample:\
        \n\`\`\`!setTos\
          \nTo continue you must accept [server names] TOS\
          \n- No kicking\
          \n- No screamin\
          \n...\
        \n\`\`\`\
      `
    )

    return
  } else if (args.toLowerCase() === `null`) args = null

  await setTosMessage(message.guild.id, args)

  message.reply(
    `
      Your server's TOS message has been set! 😁\
      \nIf you'd like to preview your TOS message use the \`!showTOS\` command 👍
    `
  )
}
