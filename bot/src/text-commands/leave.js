import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, channelName) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  if (!channelName) {
    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command requires a channel name (ex: \`${commandSymbol}${command} minecraft\`) 😔\
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
      ).size > 0
    ) {
      channel.permissionOverwrites
        .delete(message.author.id)
        .then(() =>
          message.reply(`You have been removed from <#${joinableChannelId}> 👋`)
        )
    } else message.reply(`You can't leave a channel you aren't a part of 🤔`)
  } else message.reply(`Sorry, ${channelName} does not exist 😔`)
}
