import { Permissions } from 'discord.js'
import { getBot } from '../cache-bot.js'
import { getRoleSorting, getAdminChannelId } from '../repositories/guilds.js'

Array.prototype.pushRoll = function (value) {
  this.push(value)
  if (this.length === 1) emptyRoleSortingQueue()
}

const roleSortingQueue = [],
  requiredRoles = [
    `verified`,
    `undergoing verification`,
    `!channel type: public`,
    `!channel type: joinable`,
    `!command Level: admin`,
    `!command Level: unrestricted`,
    `!command Level: restricted`,
    `!position override: 1`,
    `!position override: 2`,
    `!position override: 3`,
    `!position override: 4`,
    `!position override: 5`,
    `!position override: -1`,
    `!position override: -2`,
    `!position override: -3`,
    `!position override: -4`,
    `!position override: -5`,
  ]

export function getRoleByName(guildId, roleName) {
  return getBot()
    .guilds.cache.get(guildId)
    .roles.cache.find(role => role.name === roleName)
}

function getRoleCountByName(guildId, roleName) {
  return getBot()
    .guilds.cache.get(guildId)
    .roles.cache.filter(role => role.name === roleName).size
}

export async function sortRoles(guildId) {
  if (!(await getRoleSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
    botName = getBot().user.username,
    botRole = getRoleByName(guildId, botName),
    roles = guild.roles.cache.filter(role => role.position < botRole.position)

  let colorRoles = [],
    functionalRoles = [],
    normalRoles = []

  roles.forEach(role => {
    if (role.name.match(`^~.+~$`))
      colorRoles.push({ name: role.name, id: role.id })
    else if (role.name.match(`^!.+:`))
      functionalRoles.push({ name: role.name, id: role.id })
    else if (role.name !== `@everyone`)
      normalRoles.push({
        name: role.name,
        id: role.id,
      })
  })

  colorRoles.sort((a, b) => (a.name > b.name ? -1 : 1))
  functionalRoles.sort((a, b) => (a.name > b.name ? -1 : 1))
  normalRoles.sort((a, b) => (a.name > b.name ? -1 : 1))

  const sortedRoleArray = [...functionalRoles, ...normalRoles, ...colorRoles],
    finalRoleArray = sortedRoleArray.map((sortedRole, index) => {
      return { role: sortedRole.id, position: index + 1 }
    }),
    currentRolePositions = finalRoleArray.map(role => {
      const _role = guild.roles.cache.get(role.role)

      return { role: _role.id, position: _role.position }
    })

  console.log(`tried`)

  if (JSON.stringify(finalRoleArray) !== JSON.stringify(currentRolePositions)) {
    console.log(`sorted`)

    await guild.roles.setPositions(finalRoleArray)
  }
}

async function emptyRoleSortingQueue() {
  if (roleSortingQueue.length === 0) return

  await sortRoles(roleSortingQueue[0])

  roleSortingQueue.shift()

  emptyRoleSortingQueue()
}

export async function syncRoles(guildId) {
  const guild = getBot().guilds.cache.get(guildId)

  requiredRoles.forEach(async requiredRole => {
    if (getRoleCountByName(guildId, requiredRole) === 0)
      await guild.roles.create({
        name: requiredRole,
        permissions: [
          Permissions.FLAGS.VIEW_CHANNEL,
          Permissions.FLAGS.SEND_MESSAGES,
        ],
      })
    else if (getRoleCountByName(guildId, requiredRole) > 1) {
      const roles = guild.roles.cache.filter(role => {
        if (role.name === requiredRole) return role
      })

      roles.sort((a, b) => (a.members.size > b.members.size ? -1 : 1))
      roles.delete([...roles.keys()][0])
      roles.forEach(role => role.delete())
    }
  })

  roleSortingQueue.pushRoll(guildId)
}

export function balanceDisrupted(role) {
  if (
    requiredRoles.includes(role.name) &&
    getRoleCountByName(role.guild.id, role.name) !== 1
  )
    return true
}

export async function createRole(role) {
  if (balanceDisrupted(role)) {
    const roleName = role.name

    role.delete()

    const adminChannel = getBot().channels.cache.get(
      await getAdminChannelId(role.guild.id)
    )

    if (adminChannel)
      adminChannel.send(
        `
          \n@here\
          \nSomeone tried creating a duplicate of the \`${roleName}\` role, which I need to function 😡\

          \nIt's okay, I forgive you guys 😇\
          \nBut I did have to delete that new role...
        `
      )
    return
  } else if (role.name.match(`^~.+~$`)) {
    //update color list
  }

  const botRole = getRoleByName(role.guild.id, getBot().user.username)

  console.log(role.position < botRole.position)

  if (
    role.position < botRole.position &&
    !roleSortingQueue.includes(role.guild.id)
  ) {
    roleSortingQueue.pushRoll(role.guild.id)
  }
}

export async function modifyRole(oldRole, newRole) {
  if (
    oldRole.name !== newRole.name &&
    (balanceDisrupted(oldRole) || balanceDisrupted(newRole))
  ) {
    const roleName = newRole.name

    newRole.setName(oldRole.name)

    const adminChannel = getBot().channels.cache.get(
      await getAdminChannelId(newRole.guild.id)
    )

    if (adminChannel)
      adminChannel.send(
        `
          \n@here\
          \nSomeone tried modifying or overwritting the \`${roleName}\` role which I need to function 😡\

          \nIt's okay, I forgive you guys 😇\
          \nBut I had to rename said role back to what it was.
        `
      )
  } else if (oldRole.name.match(`^~.+~$`) || newRole.name.match(`^~.+~$`)) {
    //update color list
  }

  const botRole = getRoleByName(newRole.guild.id, getBot().user.username)

  if (
    oldRole.rawPosition !== newRole.rawPosition &&
    newRole.position < botRole.position &&
    !roleSortingQueue.includes(newRole.guild.id)
  ) {
    roleSortingQueue.pushRoll(newRole.guild.id)
  }
}

export async function deleteRole(role) {
  const guild = getBot().guilds.cache.get(role.guild.id)

  if (balanceDisrupted(role)) {
    await guild.roles.create({
      name: role.name,
      permissions: [
        Permissions.FLAGS.VIEW_CHANNEL,
        Permissions.FLAGS.SEND_MESSAGES,
      ],
    })

    const botRole = getRoleByName(role.guild.id, getBot().user.username)

    if (
      role.position < botRole.position &&
      !roleSortingQueue.includes(role.guild.id)
    )
      roleSortingQueue.pushRoll(role.guild.id)

    if (role.name === `verified`) {
      //add to public channels
    } else if (`undergoing verification`) {
      //add to verification channel
    }

    //log admin
  } else if (role.name.match(`^~.+~$`)) {
    //update color list
  }
}
