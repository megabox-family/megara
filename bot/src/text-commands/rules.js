import { getCommandName } from '../utils/text-commands.js'
import { getRules } from '../repositories/guilds.js'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol) {
  const rules = await getRules(message.guild.id)

  if (rules) message.reply(rules)
  else {
    if ((await getCommandLevelForChannel(message.channel.id)) === `admin`) {
      const commandChannels = await getFormatedCommandChannels(
        message.guild.id,
        `admin`
      )

      message.reply(
        `
          Sorry, rules have not been set for this server 😔\
          \nTo set rules, use the \`${commandSymbol}${command}\` command, example:\
          \n\`\`\`!${command}\
            \nTo continue you must accept [server name]'s rules\
            \n- No kicking\
            \n- No screamin\
          \n...\
          \n\`\`\`\
          \nThe \`!${command}\` command can be used in these channels: ${commandChannels}
        `
      )
    } else message.reply(`Sorry, rules have not been set for this server 😔`)
  }
}
