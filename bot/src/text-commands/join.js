import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, channelName) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  if (!channelName) {
    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command requires a channel name (ex: \`${commandSymbol}${command} minecraft\`) 😔\
        \nUse the \`${commandSymbol}channels\` command to list joinable channels!
      `
    )

    return
  }

  const guild = message.guild,
    joinableChannelId = await getIdForJoinableChannel(guild.id, channelName),
    channel = guild.channels.cache.get(joinableChannelId)

  if (channel) {
    if (
      channel.permissionOverwrites.cache.filter(
        permissionOverwrite => permissionOverwrite.id === message.author.id
      ).size < 1
    ) {
      channel.permissionOverwrites
        .create(message.author.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          message.reply(`You've been added to <#${joinableChannelId}> 😁`)
        )
    } else message.reply(`You already have access <#${joinableChannelId}> 🤔`)
  } else
    message.reply(
      `
      Sorry, ${channelName} does not exist 😔\
      \nUse the \`${commandSymbol}channels\` command to list joinable channels!
      `
    )
}
