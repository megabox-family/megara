import { getNameGuidelines } from '../repositories/guilds.js'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

export default async function (message) {
  const nameGuidelines = await getNameGuidelines(message.guild.id)

  if (nameGuidelines) message.reply(nameGuidelines)
  else {
    if ((await getCommandLevelForChannel(message.channel.id)) === `admin`) {
      const commandChannels = await getFormatedCommandChannels(
        message.guild.id,
        `admin`
      )

      message.reply(
        `
          Sorry, name guidelines have not been set for this server 😔\
          \nTo set name guidelines, use the \`${commandSymbol}setNameGuidelines\` command, example:\
          \nExample:\
          \n\`\`\`${commandSymbol}setNameGuidelines\
            \nWe reccomend setting your nickname to what people call you in real life.\
            \nwe're all on a first name basis in this server.\
          \n\`\`\`\
        `
      )
    } else
      message.reply(
        `Sorry, name guidelines have not been set for this server 😔`
      )
  }
}
