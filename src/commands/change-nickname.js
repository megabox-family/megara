const { isAlpha } = require('validator')
const { roles } = require('../../config')

const isNicknameValid = nickname => {
  return isAlpha(nickname) || nickname.split(/[\s-.']+/).every(x => isAlpha(x))
}

module.exports = (nickname, message) => {
  if (isNicknameValid(nickname)) {
    const allowedSymbols = [' ', '-', "'", '.']
    let newNickname = nickname.toLowerCase()

    allowedSymbols.forEach(symbol => {
      newNickname = newNickname
        .split(symbol)
        .map(x => x.charAt(0).toUpperCase() + x.substring(1))
        .join(symbol)
    })

    message.guild.members.cache.get(message.author.id).setNickname(newNickname)
    message.guild.members.cache.get(message.author.id).roles.add(roles['verified'])
    message.reply(`your nickname has been changed to ${newNickname} ^-^`)
  } else message.reply("your nickname can't have any special characters!")
}
