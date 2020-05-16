const { userIsInTestChannel, getChannelIds, getRoleIds } = require('../utils')

module.exports = (idType, message) => {
  const lowerCaseIdType = idType.toLowerCase()

  if(userIsInTestChannel(message)) {
    if(lowerCaseIdType === 'channel')
      message.reply(`\`\`\`${getChannelIds(message)}\`\`\``)
    else if(lowerCaseIdType === 'role')
      message.reply(`\`\`\`${getRoleIds(message)}\`\`\``)
  }
}
