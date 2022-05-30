import { Permissions, MessageActionRow, MessageButton } from 'discord.js'
import { getBot } from '../cache-bot.js'
import ffmpeg from 'fluent-ffmpeg'
import { getUserRoleQueue, getChannelRoleQueue } from './required-role-queue.js'
import {
  getRoleSorting,
  getAdminChannel,
  getAnnouncementChannel,
  getCommandSymbol,
} from '../repositories/guilds.js'
import { getFormatedCommandChannels } from '../repositories/channels.js'

const requiredRoles = [
    `verified`,
    `undergoing verification`,
    `server notification squad`,
    `channel notification squad`,
    `color notification squad`,
    `!channel type: archived`,
    `!channel type: hidden`,
    `!channel type: joinable`,
    `!channel type: public`,
    `!command level: admin`,
    `!command level: unrestricted`,
    `!command level: cinema`,
    `!command level: restricted`,
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
  ],
  roleSortingQueue = [],
  colorUpdateQueue = []

async function emptyRoleSortingQueue() {
  if (roleSortingQueue.length === 0) return

  await sortRoles(roleSortingQueue[0])
  // await new Promise(resolve => setTimeout(resolve, 3000))

  roleSortingQueue.shift()

  emptyRoleSortingQueue()
}

export function pushToRoleSortingQueue(GuildId) {
  if (!roleSortingQueue.includes(GuildId)) roleSortingQueue.push(GuildId)

  if (roleSortingQueue.length === 1) emptyRoleSortingQueue()
}

async function emptyColorUpdateQueue() {
  if (colorUpdateQueue.length === 0) return

  await updateColorList(colorUpdateQueue[0])

  colorUpdateQueue.shift()

  emptyColorUpdateQueue()
}

function pushToColorUpdateQueue(GuildId) {
  if (!colorUpdateQueue.includes(GuildId)) colorUpdateQueue.push(GuildId)

  if (colorUpdateQueue.length === 1) emptyColorUpdateQueue()
}

export function requiredRoleDifference(guild, oldRoles, newRoles) {
  const _requiredRoles = guild.roles.cache.filter(guildRole =>
    requiredRoles.includes(guildRole.name)
  )

  return _requiredRoles.find(_requriedRole => {
    if (
      oldRoles.includes(_requriedRole.id) &&
      !newRoles.includes(_requriedRole.id)
    )
      return _requriedRole
  })
}

export async function updateColorList(guildId) {
  const guild = getBot().guilds.cache.get(guildId),
    colorRoles = guild.roles.cache.filter(role => role.name.match(`^~.+~`))

  if (colorRoles.size === 0) return

  const colorRolesFormatted = colorRoles.map(colorRole => {
    return {
      name: colorRole.name.match(`(?!~).+(?=~)`)[0],
      color: colorRole.hexColor,
    }
  })

  colorRolesFormatted.sort((a, b) => (a.name < b.name ? -1 : 1))

  let widthArray = [],
    height = 6,
    drawTextFilterArray = []

  colorRolesFormatted.forEach(colorRole => {
    let width = 12,
      padding = 0

    if (!colorRole.name.match(`[tdfhjklb]`)) {
      padding += 4
    }

    width += colorRole.name.length * 14
    widthArray.push(width)

    const escapedName = colorRole.name
      .replaceAll(`\\`, `\\\\\\\\\\\\\\\\`)
      .replaceAll(`%`, '\\\\\\\\$&')
      .replace(/'|"|,|:|;/g, `\\\\\\$&`)

    drawTextFilterArray.push(
      `drawtext=fontfile=/app/src/media/RobotoMono-Bold.ttf:text=${escapedName}:x=6:y=${
        height + padding
      }:fontsize=24:fontcolor=${colorRole.color}`
    )

    height += 30
  })

  widthArray.sort((a, b) => a - b)

  const resolution = `${widthArray.pop()}x${height}`

  await ffmpeg()
    .input(`color=color=black@0.0:size=${resolution},format=rgba`)
    .inputFormat(`lavfi`)
    .inputOption(`-y`)
    .outputOption(`-vf`, drawTextFilterArray.join(`,`))
    .outputOption(`-vframes 1`)
    .outputOption(`-q:v 2`)
    .save(`/app/src/media/${guild.id}.png`)
}

export async function sortRoles(guildId) {
  if (!(await getRoleSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId),
    botRole = guild.roles.cache.find(
      role => role.name === getBot().user.username
    ),
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
      return { role: sortedRole.id, position: index + 1, name: sortedRole.name }
    }),
    currentRolePositions = finalRoleArray.map(role => {
      const _role = guild.roles.cache.get(role.role)

      if (!_role)
        console.log(
          `This role is deleted but we're trying to sort it: ${role.role}`
        )

      return { role: _role?.id, position: _role?.position, name: _role?.name }
    })

  // console.log(finalRoleArray, `\n\n`)
  // console.log(finalRoleArray, currentRolePositions, `\n\n\n\n\n`)

  console.log(`tried sorting roles`)

  if (JSON.stringify(finalRoleArray) !== JSON.stringify(currentRolePositions)) {
    console.log(`sorted roles`)

    await guild.roles
      .setPositions(finalRoleArray)
      .catch(error =>
        console.log(`role sorting failed, see error below:\n`, error)
      )
  }
}

export async function syncRoles(guild) {
  requiredRoles.forEach(async requiredRole => {
    if (guild.roles.cache.filter(role => role.name === requiredRole).size === 0)
      await guild.roles.create({
        name: requiredRole,
        permissions: [
          Permissions.FLAGS.VIEW_CHANNEL,
          Permissions.FLAGS.SEND_MESSAGES,
          Permissions.FLAGS.READ_MESSAGE_HISTORY,
        ],
      })
    else if (
      guild.roles.cache.filter(role => role.name === requiredRole).size > 1
    ) {
      const roles = guild.roles.cache.filter(role => {
        if (role.name === requiredRole) return role
      })

      roles.sort((a, b) => (a.members.size > b.members.size ? -1 : 1))
      roles.delete([...roles.keys()][0])
      roles.forEach(role => role.delete())
    }
  })

  pushToColorUpdateQueue(guild.id)

  pushToRoleSortingQueue(guild.id)
}

export function balanceDisrupted(role) {
  if (
    requiredRoles.includes(role.name) &&
    role.guild.roles.cache.filter(_role => _role.name === role.name).size !== 1
  )
    return true
}

async function verifyColorListFinishedUpdating(guildId) {
  if (!colorUpdateQueue.includes(guildId)) return
  else {
    await new Promise(resolve => setTimeout(resolve, 1000))
    await verifyColorListFinishedUpdating(guildId)
  }
}

async function announceColorChange(oldRole, newRole) {
  const guild = oldRole.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id)

  if (!announcementChannelId) return

  const announcementChannel = guild.channels.cache.get(announcementChannelId),
    colorNotificationSquad = guild.roles.cache.find(
      role => role.name === `color notification squad`
    ),
    buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!subscribe: ${colorNotificationSquad.id}`)
        .setLabel(`Subscribe to color notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${colorNotificationSquad.id}`)
        .setLabel(`Unsubscribe from color notifications`)
        .setStyle('SECONDARY')
    ),
    commandSymbol = await getCommandSymbol(guild.id),
    commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    ),
    isRoleDeleted = guild.roles.cache.find(role => role.id === oldRole.id),
    oldRoleName = oldRole.name.replaceAll(`~`, ``),
    newRoleName = newRole?.name.replaceAll(`~`, ``)

  let message = `${colorNotificationSquad} Hey guys! 😁`

  if (!isRoleDeleted)
    message += `\
      \nThe **${oldRoleName}** color role has been removed from the server, you can view the updated color list by using the \`${commandSymbol}color list\` command.\
      \nThe \`${commandSymbol}color list\` command can be used in these channels: ${commandChannels}
    `
  else if (newRole == null || oldRoleName === `new role`)
    message += `\
      \nA new color role has been created - **${newRoleName}**, go check it out by using the \`${commandSymbol}color\` command.\
      \nThe \`${commandSymbol}color\` command can be used in these channels: ${commandChannels}
    `
  else if (oldRoleName !== newRoleName && oldRole.hexColor !== newRole.hexColor)
    message += `\
      \nThe **${oldRoleName} (${oldRole.hexColor})** color role's name & hue has been changed to **${newRoleName} (${newRole.hexColor})**, go check it out by using the \`${commandSymbol}color\` command.\
      \nThe \`${commandSymbol}color\` command can be used in these channels: ${commandChannels}
    `
  else if (oldRoleName !== newRoleName)
    message += `\
      \nThe **${oldRoleName}** color role's name has been changed to **${newRoleName}**, go check it out by using the \`${commandSymbol}color\` command.\
      \nThe \`${commandSymbol}color\` command can be used in these channels: ${commandChannels}
    `
  else
    message += `\
      \nThe **${oldRoleName}** color role's hue has been changed from **${oldRole.hexColor}** to **${newRole.hexColor}**, go check it out by using the \`${commandSymbol}color\` command.\
      \nThe \`${commandSymbol}color\` command can be used in these channels: ${commandChannels}
    `

  await verifyColorListFinishedUpdating(guild.id)

  announcementChannel.send({
    content: message,
    files: [`/app/src/media/${guild.id}.png`],
    components: [buttonRow],
  })
}

export async function createRole(role) {
  const guild = role.guild,
    roles = guild.roles.cache,
    botRole = roles.find(role => role.name === getBot().user.username)

  roles.forEach(async _role => {
    if (_role.name === `new role` && _role.id !== role.id && !_role.deleted)
      await _role.delete().catch(error => console.log(`it don't exist bruh`))
  })

  if (balanceDisrupted(role)) {
    const roleName = role.name

    role.delete()

    const adminChannel = guild.channels.cache.get(
      await getAdminChannel(guild.id)
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
    pushToColorUpdateQueue(guild.id)
    announceColorChange(role)
  }

  if (
    role.position < botRole.position &&
    !roleSortingQueue.includes(guild.id) &&
    role.name !== `new role`
  ) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), 3000)
  }
}

export async function modifyRole(oldRole, newRole) {
  const guild = newRole.guild,
    botRole = guild.roles.cache.find(
      role => role.name === getBot().user.username
    )

  if (
    oldRole.name !== newRole.name &&
    (balanceDisrupted(oldRole) || balanceDisrupted(newRole))
  ) {
    const roleName = newRole.name

    newRole.setName(oldRole.name)

    const adminChannel = getBot().channels.cache.get(
      await getAdminChannel(guild.id)
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
  } else if (
    (!oldRole.name.match(`^~.+~$`) && newRole.name.match(`^~.+~$`)) ||
    (oldRole.name.match(`^~.+~$`) && !newRole.name.match(`^~.+~$`)) ||
    (oldRole.name.match(`^~.+~$`) &&
      newRole.name.match(`^~.+~$`) &&
      oldRole.name !== newRole.name) ||
    (oldRole.name.match(`^~.+~$`) &&
      newRole.name.match(`^~.+~$`) &&
      oldRole.color !== newRole.color)
  ) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    pushToColorUpdateQueue(guild.id)
    announceColorChange(oldRole, newRole)
  }

  if (
    (oldRole.rawPosition !== newRole.rawPosition ||
      oldRole.name !== newRole.name) &&
    newRole.position < botRole.position &&
    !roleSortingQueue.includes(guild.id)
  ) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), 3000)
  }
}

export async function deleteRole(role) {
  const guild = role.guild

  if (balanceDisrupted(role)) {
    const newRole = await guild.roles.create(role),
      UserRoleQueue = getUserRoleQueue(),
      userArray = UserRoleQueue
        ? UserRoleQueue.filter(
            record =>
              record.guild === newRole.guild.id && record.role === newRole.name
          ).map(record => record.user)
        : null,
      channelRoleQueue = getChannelRoleQueue(),
      channelArray = channelRoleQueue
        ? channelRoleQueue
            .filter(
              record =>
                record.guild === newRole.guild.id &&
                record.role === newRole.name
            )
            .map(record => {
              return {
                channelId: record.channel,
                overwrite: record.permissionOverwrite,
              }
            })
        : null

    if (userArray)
      userArray.forEach(user =>
        guild.members.cache.get(user).roles.add(newRole)
      )

    if (channelArray)
      channelArray.forEach(channel => {
        channel.overwrite.allow = channel.overwrite.allow.serialize()
        channel.overwrite.deny = channel.overwrite.deny.serialize()

        const permissionKeys = Object.keys(channel.overwrite.allow),
          finalPermissionObject = {}

        permissionKeys.forEach(key => {
          if (channel.overwrite.allow[key] !== channel.overwrite.deny[key])
            finalPermissionObject[key] = channel.overwrite.allow[key]
        })

        guild.channels.cache
          .get(channel.channelId)
          .permissionOverwrites.create(newRole.id, finalPermissionObject)
      })

    const adminChannel = guild.channels.cache.get(
      await getAdminChannel(guild.id)
    )

    if (adminChannel)
      adminChannel.send(
        `
          \n@here\
          \nSomeone tried deleting the \`${newRole.name}\` role, which I need to function 😡\

          \nIt's okay, I forgive you guys 😇\
          \nI did my best to restore the role and re-assign it to users and channels, but I may have missed something.\
          
          \nIf you recently removed this role from a user or channel it's possible that it was re-added, I'd peek around to make sure everything is okay 👀\
        `
      )

    if (!roleSortingQueue.includes(guild.id))
      setTimeout(() => pushToRoleSortingQueue(guild.id), 3000)
  } else if (role.name.match(`^~.+~$`)) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    pushToColorUpdateQueue(guild.id)
    announceColorChange(role)
  }
}
