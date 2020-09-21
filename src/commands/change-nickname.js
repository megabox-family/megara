const { isAlpha } = require('validator')
const { getIdForRole } = require('../repositories/roles')
const { getCommandLevelForChannel } = require('../repositories/channels')
const { formatReply } = require('../utils')

const isNicknameValid = nickname => {
  return isAlpha(nickname) || nickname.split(/[\s-.']+/).every(x => isAlpha(x))
}

module.exports = async (nickname, { message, guild, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  if (isNicknameValid(nickname)) {
    const allowedSymbols = [' ', '-', "'", '.']
    let newNickname = nickname.toLowerCase()

    allowedSymbols.forEach(symbol => {
      newNickname = newNickname
        .split(symbol)
        .map(x => x.charAt(0).toUpperCase() + x.substring(1))
        .join(symbol)
    })

    const verifiedRoleId = await getIdForRole('verified')

    guild.members.cache.get(message.author.id).setNickname(newNickname)
    guild.members.cache.get(message.author.id).roles.add(verifiedRoleId)
    message.reply(
      formatReply(
        `your nickname has been changed to ${newNickname} ^-^`,
        isDirectMessage
      )
    )
  } else
    message.reply(
      formatReply(
        "your nickname can't have any special characters!",
        isDirectMessage
      )
    )
}
