import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { removeMemberFromChannel } from '../utils/channels.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, channelName) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  if (!channelName) {
    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command requires a channel name (ex: \`${commandSymbol}${command} minecraft\`) 😔\
        \nUse the \`${commandSymbol}channels\` command to list channels!
      `
    )

    return
  }

  const guild = message.guild,
    joinableChannelId = await getIdForJoinableChannel(guild.id, channelName)

  if (!joinableChannelId) {
    message.reply(
      `${channelName} is either a channel that doesn't exist or one that you can't leave 🤔`
    )

    return
  }

  const channel = guild.channels.cache.get(joinableChannelId)

  if (!channel) {
    message.reply(
      `I was unable to remove you from ${channelName} for an unknown reason, please contact a server administrator for help. 😬`
    )

    return
  }

  const guildMember = guild.members.cache.get(message.author.id),
    result = await removeMemberFromChannel(guildMember, channel.id)

  if (result === `removed`)
    message.reply(`You've been removed from **${channel}** 👋`)
  else message.reply(`You aren't in **${channel}** 🤔`)
}
