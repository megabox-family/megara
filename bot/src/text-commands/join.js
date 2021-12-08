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
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
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
        \nUse the \`${commandSymbol}channelList\` command to list joinable channels!
      `
    )

    return
  }

  const joinableChannelId = await getIdForJoinableChannel(channelName),
    channel = message.guild.channels.cache.get(joinableChannelId)

  if (joinableChannelId) {
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
      \nUse the \`${commandSymbol}channelList\` command to list joinable channels!
      `
    )
}
