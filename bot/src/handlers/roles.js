import { getBot } from '../cache-bot.js'
import {
  pushToRoleSortingQueue,
  roleSortPauseDuration,
} from '../utils/roles.js'

export async function handleRoleCreate(role) {
  const { guild } = role,
    { roles } = guild,
    botRole = roles.cache.find(role => role.tags?.botId === getBot().user.id)

  roles.cache.forEach(async _role => {
    if (_role.name === `new role` && _role.id !== role.id)
      await _role.delete().catch(error => console.log(`it don't exist bruh`))
  })

  if (role.position < botRole.position && role.name !== `new role`) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), roleSortPauseDuration)
  }
}

export async function handleRoleUpdate(oldRole, newRole) {
  const { guild } = newRole,
    botRole = guild.roles.cache.find(
      role => role.tags?.botId === getBot().user.id
    )

  if (
    (oldRole.rawPosition !== newRole.rawPosition ||
      oldRole.name !== newRole.name) &&
    newRole.position < botRole.position
  ) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), roleSortPauseDuration)
  }
}

export async function handleRoleDelete() {}
