const { isAlpha } = require('validator')
const { getIdForRole } = require('../repositories/roles')

const isNicknameValid = nickname => {
  return isAlpha(nickname) || nickname.split(/[\s-.']+/).every(x => isAlpha(x))
}

module.exports = async (nickname, message) => {
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

    message.guild.members.cache.get(message.author.id).setNickname(newNickname)
    message.guild.members.cache.get(message.author.id).roles.add(verifiedRoleId)
    message.reply(`your nickname has been changed to ${newNickname} ^-^`)
  } else message.reply("your nickname can't have any special characters!")
}
