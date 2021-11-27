import {
  userIsInTestChannel,
  getChannelIdsWithNames,
  getRoleIdsWithNames,
} from '../utils.js'

export default function (idType, { message }) {
  const lowerCaseIdType = idType.toLowerCase()

  if (userIsInTestChannel(message)) {
    if (lowerCaseIdType === 'channel')
      message.reply(`\`\`\`${getChannelIdsWithNames(message)}\`\`\``)
    else if (lowerCaseIdType === 'role')
      message.reply(`\`\`\`${getRoleIdsWithNames(message)}\`\`\``)
  }
}
