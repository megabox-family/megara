import { setChannelSorting } from '../repositories/guilds.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import { sortChannels } from '../utils/channels.js'

export default async function (message, commandSymbol, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}channelSorting\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (!args || ![`true`, `false`].includes(args.toLowerCase())) {
    message.reply(
      `
        Invalid input, the \`${commandSymbol}channelSorting\` command can only be set to \`true\` or \`false\` 🤔\
        \nExample: \`${commandSymbol}channelSorting true\`
      `
    )

    return
  }

  args = args === `true` ? true : false

  await setChannelSorting(message.guild.id, args)

  if (args) {
    message.reply(`Channel sorting has been enabled, watch em sort! 🤩`)

    sortChannels(message.guild.id)
  } else
    message.reply(
      `Channel sorting has been disabled, have fun sorting them yourself 😜`
    )
}
