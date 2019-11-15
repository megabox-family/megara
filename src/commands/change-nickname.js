const { isAlpha } = require('validator')

const isNicknameValid = nickname => {
  return isAlpha(nickname) || nickname.split(/[\s-]+/).every(x => isAlpha(x))
}

module.exports = (nickname, msg) => {
  if (isNicknameValid(nickname)) {
    const allowedSymbols = [' ', '-', "'"]
    let newNickname = nickname.toLowerCase()

    allowedSymbols.forEach(symbol => {
      newNickname = newNickname
        .split(symbol)
        .map(x => x.charAt(0).toUpperCase() + x.substring(1))
        .join(symbol)
    })

    msg.guild.members.get(msg.author.id).setNickname(newNickname)
    msg.reply(`Your nickname has been changed to ${newNickname} ^_^`)
  } else msg.reply("Your nickname can't have any special characters!")
}
