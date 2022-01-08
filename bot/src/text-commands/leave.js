import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import {
  getIdForJoinableChannel,
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, channelName) {
  const guild = message.guild,
    commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    )

    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔\
        \nBut here's a list of channels you can use it in: ${commandChannels}
      `
    )

    return
  }

  if (!channelName) {
    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command requires a channel name (ex: \`${commandSymbol}${command} minecraft\`) 😔\
      `
    )

    return
  }

  const joinableChannelId = await getIdForJoinableChannel(
      guild.id,
      channelName
    ),
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
