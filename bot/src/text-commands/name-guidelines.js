import { getCommandName } from '../utils/text-commands.js'
import { getNameGuidelines } from '../repositories/guilds.js'
import {
  getFormatedCommandChannels,
  getCommandLevelForChannel,
} from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol) {
  const nameGuidelines = await getNameGuidelines(message.guild.id)

  if (nameGuidelines) message.reply(nameGuidelines)
  else {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `admin`
    )

    if ((await getCommandLevelForChannel(message.channel.id)) === `admin`) {
      message.reply(
        `
          Sorry, name guidelines have not been set for this server 😔\
          \nTo set name guidelines, use the \`${commandSymbol}${command}\` command, example:\
          \nExample:\
          \n\`\`\`${commandSymbol}${command}\
            \nWe recommend setting your nickname to what people call you in real life.\
            \nwe're all on a first name basis in this server.\
          \n\`\`\`\
          \nThe \`!${command}\` command can be used in these channels: ${commandChannels}
        `
      )
    } else
      message.reply(
        `Sorry, name guidelines have not been set for this server 😔`
      )
  }
}
