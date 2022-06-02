import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { addMemberToChannel } from '../utils/channels.js'
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
    joinableChannelId = await getIdForJoinableChannel(guild.id, channelName)

  if (!joinableChannelId) {
    message.reply(
      `${channelName} is either a channel that doesn't exist or one that you can't join 🤔`
    )

    return
  }

  const channel = guild.channels.cache.get(joinableChannelId)

  if (!channel) {
    message.reply(
      `I was unable to add you to ${channelName} for an unknown reason, please contact a server administrator for help. 😬`
    )

    return
  }

  const guildMember = guild.members.cache.get(message.author.id),
    result = await addMemberToChannel(guildMember, channel.id)

  if (result === `added`)
    message.reply(`You've been added to **${channel}** 😁`)
  else message.reply(`You already have access **${channel}** 🤔`)
}
