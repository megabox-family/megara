const {
  userIsInTestChannel,
  getChannelIdsWithNames,
  getRoleIdsWithNames,
} = require('../utils')

module.exports = (idType, { message }) => {
  const lowerCaseIdType = idType.toLowerCase()

  if (userIsInTestChannel(message)) {
    if (lowerCaseIdType === 'channel')
      message.reply(`\`\`\`${getChannelIdsWithNames(message)}\`\`\``)
    else if (lowerCaseIdType === 'role')
      message.reply(`\`\`\`${getRoleIdsWithNames(message)}\`\`\``)
  }
}
