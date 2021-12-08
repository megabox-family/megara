Array.prototype.pushUserRole = function (value) {
  this.push(value)
  if (this.length === 1) setTimeout(() => (this.length = 0), 10000)
}

Array.prototype.pushChannelRole = function (value) {
  this.push(value)
  if (this.length === 1) setTimeout(() => (this.length = 0), 10000)
}

const UserRoleQueue = [],
  channelRoleQueue = []

export function pushUserToQueue(record) {
  UserRoleQueue.pushUserRole(JSON.parse(JSON.stringify(record)))
}

export function getUserRoleQueue() {
  return UserRoleQueue
}

export function pushChannelToQueue(record) {
  channelRoleQueue.pushChannelRole(record)
}

export function getChannelRoleQueue() {
  return channelRoleQueue
}
