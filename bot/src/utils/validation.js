export const commasFollowedBySpace = /,\s+/g

export function getButtonContext(customId) {
  return customId.match(`(?<=:\\s).+`)?.[0]
}

export function isColorRole(roleName) {
  return roleName.match(`^~.+~$`)
}

export function isNotificationRole(roleName) {
  return roleName.match(`^-.+-$`)
}

export function getNotificationRoleBasename(roleName) {
  return roleName.match(`(?<=-).+(?=-)`)?.[0]
}

export function getRoleIdFromTag(tag) {
  return tag.match(`(?!<@&)[0-9]+(?<!>)`)?.[0]
}

export function getButtonNumber(listItem) {
  return listItem.match(`[0-9]+(?=\\.)`)?.[0]
}

export function getRoleIdsFromMessage(message) {
  return message.match(/(?<=<@&)[0-9]{18}(?=>)/g)
}

export function isDynamicThread(threadName) {
  return threadName.match(`(?!.*-)[0-9]+$`)
}

export function getUserIdFromTag(userTag) {
  return userTag.match(`((?<=^<@!)|(?<=^<@))[0-9]+(?=>$)`)?.[0]
}

export function formatQuestion(question) {
  if (!question.match(`\\?$`)) return `${question.trim()}?`

  return question.trim()
}

export function validateTimeStamp(timeStamp) {
  const correctStructure = timeStamp.match(
    `^[0-9]$|^[0-9][0-9]$|^[0-9]:[0-9][0-9]$|^[0-9][0-9]:[0-9][0-9]$|^[0-9]:[0-9][0-9]:[0-9][0-9]$|[0-9][0-9]:[0-9][0-9]:[0-9][0-9]`
  )

  if (correctStructure) {
    const noColons = timeStamp.replaceAll(`:`, ``)

    if (parseInt(noColons) === 0) return false
    else return true
  }

  return false
}

export function formatPercent(number) {
  return Number(number).toLocaleString(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
  })
}

export function validateTagArray(tagArray) {
  const invalidTag = tagArray.find(
    tag => !tag.match(`^<@&[0-9]+>$|^<@[0-9]+>$`)
  )

  return invalidTag ? false : true
}
