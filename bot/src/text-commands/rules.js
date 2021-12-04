import { getRules } from '../repositories/guilds.js'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

export default async function (message) {
  const tosMessage = await getRules(message.guild.id)

  if (tosMessage) message.reply(tosMessage)
  else {
    if ((await getCommandLevelForChannel(message.channel.id)) === `admin`) {
      const commandChannels = await getFormatedCommandChannels(
        message.guild.id,
        `admin`
      )

      message.reply(
        `
          Sorry, rules have not been set for this server 😔\
          \nTo set rules, use the \`!setRules\` command, example:\
          \n\`\`\`!setRules\
            \nTo continue you must accept [server name]'s rules\
            \n- No kicking\
            \n- No screamin\
          \n...\
          \n\`\`\`\
          \nThe \`!setRules\` command can be used in these channels: ${commandChannels}
        `
      )
    } else message.reply(`Sorry, rules have not been set for this server 😔`)
  }
}
