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
  return tag.match(`(?<=&)[0-9]+`)?.[0]
}

export function getButtonNumber(listItem) {
  return listItem.match(`[0-9]+(?=\\.)`)?.[0]
}

export function getRoleIdsFromMessage(message) {
  return message.match(/(?<=<@&)[0-9]{18}(?=>)/g)
}
