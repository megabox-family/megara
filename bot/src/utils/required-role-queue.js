const UserRoleQueue = [],
  channelRoleQueue = []

export function pushUserToQueue(record) {
  UserRoleQueue.push(JSON.parse(JSON.stringify(record)))

  if (UserRoleQueue.length === 1)
    setTimeout(() => (UserRoleQueue.length = 0), 10000)
}

export function getUserRoleQueue() {
  return UserRoleQueue
}

export function pushChannelToQueue(record) {
  channelRoleQueue.push(record)

  if (channelRoleQueue.length === 1)
    setTimeout(() => (channelRoleQueue.length = 0), 10000)
}

export function getChannelRoleQueue() {
  return channelRoleQueue
}
