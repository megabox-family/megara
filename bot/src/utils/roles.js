import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import { getBot } from '../cache-bot.js'
import { isColorRole, isNotificationRole } from './validation.js'
import { getExpectedRunTime, pauseDuation } from './members.js'
import {
  getRoleSorting,
  getAdminChannel,
  getAnnouncementChannel,
  getVipRoleId,
  setVipRoleId,
  getPauseColorNotifications,
} from '../repositories/guilds.js'

const validator = { isColorRole, isNotificationRole }

export const roleSortPauseDuration = 3000

const requiredRoles = [
    `verified`,
    `undergoing-verification`,
    `-server-notifications-`,
    `-channel-notifications-`,
  ],
  roleSortingQueue = [],
  batchRoleQueue = new Map()

export function getTotalBatchRoleQueueMembers() {
  let totalMembers = 0

  if (batchRoleQueue.size === 0) return 0

  batchRoleQueue.forEach(
    queuedRole => (totalMembers += queuedRole.members.length)
  )

  return totalMembers
}

async function emptyBatchRoleQueue() {
  if (batchRoleQueue.size === 0) return

  const [roleId] = batchRoleQueue.keys(),
    firstValue = batchRoleQueue.get(roleId),
    addOrRemove = firstValue.addOrRemove,
    members = firstValue.members,
    role = firstValue.role

  if (role) {
    await batchAddOrRemoveRole(members, role, addOrRemove)
  }

  batchRoleQueue.delete(roleId)

  console.log(`batch role loop`)

  emptyBatchRoleQueue()
}

export async function addToBatchRoleQueue(roleId, context) {
  if (!batchRoleQueue.has(roleId)) {
    batchRoleQueue.set(roleId, context)

    if (batchRoleQueue.size === 1) emptyBatchRoleQueue()
  } else {
    batchRoleQueue.delete(roleId)

    await new Promise(resolve => setTimeout(resolve, pauseDuation))

    batchRoleQueue.set(roleId, context)

    if (batchRoleQueue.size === 1) emptyBatchRoleQueue()
  }
}

async function emptyRoleSortingQueue() {
  if (roleSortingQueue.length === 0) return

  await sortRoles(roleSortingQueue[0])

  roleSortingQueue.shift()

  console.log(`role sort loop`)

  emptyRoleSortingQueue()
}

export function pushToRoleSortingQueue(GuildId) {
  if (!roleSortingQueue.includes(GuildId)) {
    roleSortingQueue.push(GuildId)

    if (roleSortingQueue.length === 1) emptyRoleSortingQueue()
  }
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

export async function sortRoles(guildId) {
  if (!(await getRoleSorting(guildId))) return

  const guild = getBot().guilds.cache.get(guildId)

  await guild.roles.fetch()

  const botRole = guild.roles.cache.find(
      role => role.tags?.botId === getBot().user.id
    ),
    roles = guild.roles.cache.filter(
      role => role.position < botRole.position && role.name !== `@everyone`
    )

  let colorRoles = [],
    notificationRoles = [],
    functionalRoles = [],
    normalRoles = []

  roles.forEach(role => {
    if (role.name.match(`^~.+~$|^<.+>$`))
      colorRoles.push({ name: role.name, id: role.id })
    else if (role.name.match(`^-.+-$`))
      notificationRoles.push({ name: role.name, id: role.id })
    else if (role.name.match(`^!.+:`))
      functionalRoles.push({ name: role.name, id: role.id })
    else
      normalRoles.push({
        name: role.name,
        id: role.id,
        position: role.position,
      })
  })

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  functionalRoles.sort((a, b) => collator.compare(b.name, a.name))
  notificationRoles.sort((a, b) => collator.compare(b.name, a.name))
  normalRoles.sort((a, b) => collator.compare(a.position, b.position))
  colorRoles.sort((a, b) => collator.compare(b.name, a.name))

  const sortedRoleArray = [
    ...functionalRoles,
    ...notificationRoles,
    ...normalRoles,
    ...colorRoles,
  ]

  const finalRoleArray = sortedRoleArray.map((sortedRole, index) => {
      return { role: sortedRole.id, position: index + 1, name: sortedRole.name }
    }),
    currentRolePositions = roles.map(role => {
      return { role: role.id, position: role.position, name: role.name }
    })

  currentRolePositions.sort((a, b) => collator.compare(a.position, b.position))

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

export async function syncCustomColors(guild) {
  const roles = guild.roles.cache,
    unusedCustomColorRoles = []

  roles.forEach(role => {
    if (role.name.match(`^<.+>$`) && role.members.size === 0)
      unusedCustomColorRoles.push(role)
  })

  for (const unusedCustomRole of unusedCustomColorRoles) {
    await unusedCustomRole
      .delete()
      .catch(error => `I was unable to delete a custom color role:\n${error}`)

    await new Promise(resolve => setTimeout(resolve, 10000))
  }
}

export async function syncRoles(guild) {
  requiredRoles.forEach(async requiredRole => {
    if (guild.roles.cache.filter(role => role.name === requiredRole).size === 0)
      await guild.roles.create({
        name: requiredRole,
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

  syncCustomColors(guild)

  pushToRoleSortingQueue(guild.id)
}

export function balanceDisrupted(role) {
  if (
    requiredRoles.includes(role.name) &&
    role.guild.roles.cache.filter(_role => _role.name === role.name).size !== 1
  )
    return true
}

async function announceColorChange(oldRole, newRole) {
  const guild = oldRole.guild,
    pauseColorNotifications = await getPauseColorNotifications(guild.id)

  if (pauseColorNotifications) return

  const announcementChannelId = await getAnnouncementChannel(guild.id)

  if (!announcementChannelId) return

  const announcementChannel = guild.channels.cache.get(announcementChannelId),
    colorNotificationSquad = guild.roles.cache.find(
      role => role.name === `-color notifications-`
    ),
    buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!unsubscribe: ${colorNotificationSquad.id}`)
        .setLabel(`Unsubscribe from color notifications`)
        .setStyle(ButtonStyle.Secondary)
    ),
    isRoleDeleted = guild.roles.cache.find(role => role.id === oldRole.id),
    oldRoleName = oldRole.name.replaceAll(`~`, ``),
    newRoleName = newRole?.name.replaceAll(`~`, ``)

  let message = `${colorNotificationSquad} Hey guys! 😁\n`,
    embed

  if (!isRoleDeleted) {
    message += `The **${oldRoleName}** color role has been removed from the server.`
  } else if (newRole == null || oldRoleName === `new role`) {
    message += `A new color role has been created - **${newRoleName}**.`

    embed = new EmbedBuilder()
      .setTitle(`Color Update`)
      .addFields({
        name: `──────────────────────────────`,
        value: `${oldRole}`,
      })
      .setTimestamp()
  } else if (
    oldRoleName !== newRoleName &&
    oldRole.hexColor !== newRole.hexColor
  ) {
    message += `The **${oldRoleName} (${oldRole.hexColor})** color role's name & hue has been changed to **${newRoleName} (${newRole.hexColor})**.`

    embed = new EmbedBuilder()
      .setTitle(`Color Update`)
      .addFields({
        name: `──────────────────────────────`,
        value: `${newRole}`,
      })
      .setTimestamp()
  } else if (oldRoleName !== newRoleName) {
    message += `The **${oldRoleName}** color role's name has been changed to **${newRoleName}**.`

    embed = new EmbedBuilder()
      .setTitle(`Color Update`)
      .addFields({
        name: `──────────────────────────────`,
        value: `${newRole}`,
      })
      .setTimestamp()
  } else {
    message += `The **${oldRoleName}** color role's hue has been changed from **${oldRole.hexColor}** to **${newRole.hexColor}**.`

    embed = new EmbedBuilder()
      .setTitle(`Color Update`)
      .addFields({
        name: `──────────────────────────────`,
        value: `${newRole}`,
      })
      .setTimestamp()
  }

  message += `\nYou can view available colors and set your color by using the \`/color-list\` command.`

  if (embed)
    announcementChannel.send({
      content: message,
      embeds: [embed],
      components: [buttonRow],
    })
  else
    announcementChannel.send({
      content: message,
      components: [buttonRow],
    })
}

export async function createRole(role) {
  const guild = role.guild,
    roles = guild.roles.cache,
    botRole = roles.find(role => role.tags?.botId === getBot().user.id)

  roles.forEach(async _role => {
    if (_role.name === `new role` && _role.id !== role.id)
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
        `@here` +
          `\nSomeone tried creating a duplicate of the \`${roleName}\` role, which I need to function 😡` +
          `\n\nIt's okay, I forgive you guys 😇` +
          `\nBut I did have to delete that new role...`
      )
    return
  } else if (isColorRole(role.name)) {
    announceColorChange(role)
  } else if (isNotificationRole(role.name)) {
    const relevantMembers = guild.members.cache
      .filter(member => member.id !== getBot().user.id)
      .map(member => member)

    if (relevantMembers.length > 0) {
      await addToBatchRoleQueue(role.id, {
        addOrRemove: `add`,
        members: relevantMembers,
        role: role,
      })

      const totalQueuedMembers = getTotalBatchRoleQueueMembers()

      if (totalQueuedMembers > 0) {
        const adminChannelId = await getAdminChannel(guild.id),
          adminChannel = adminChannelId
            ? guild.channels.cache.get(adminChannelId)
            : null

        const alphaRunTime = getExpectedRunTime(totalQueuedMembers)

        await adminChannel?.send(
          `A new notification role, **${newRole.name}**, has been created 🔔` +
            `\nThis role will automatically be added to ${relevantMembers.length} members in the server.` +
            `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
        )
      }
    }
  }

  if (role.position < botRole.position && role.name !== `new role`) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), roleSortPauseDuration)
  }
}

export async function modifyRole(oldRole, newRole) {
  const guild = newRole.guild,
    botRole = guild.roles.cache.find(
      role => role.tags?.botId === getBot().user.id
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
        `@here` +
          `\nSomeone tried modifying or overwritting the \`${roleName}\` role which I need to function 😡` +
          `\n\nIt's okay, I forgive you guys 😇` +
          `\nBut I had to rename said role back to what it was.`
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
    await new Promise(resolve => setTimeout(resolve, roleSortPauseDuration))
    announceColorChange(oldRole, newRole)
  } else if (
    !isNotificationRole(oldRole.name) &&
    isNotificationRole(newRole.name)
  ) {
    const relevantMembers = guild.members.cache
      .filter(
        member =>
          !member._roles.includes(newRole.id) && member.id !== getBot().user.id
      )
      .map(member => member)

    if (relevantMembers.length > 0) {
      await addToBatchRoleQueue(newRole.id, {
        addOrRemove: `add`,
        members: relevantMembers,
        role: newRole,
      })

      const totalQueuedMembers = getTotalBatchRoleQueueMembers()

      if (totalQueuedMembers > 0 && relevantMembers.length > 0) {
        const adminChannelId = await getAdminChannel(guild.id),
          adminChannel = adminChannelId
            ? guild.channels.cache.get(adminChannelId)
            : null

        const alphaRunTime = getExpectedRunTime(totalQueuedMembers)

        await adminChannel?.send(
          `A role's name was changed from **${oldRole.name}** to **${newRole.name}**, and is therefore a notification role 🔔` +
            `\nThis role will automatically be added to ${relevantMembers.length} members in the server.` +
            `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
        )
      }
    }
  } else if (
    isNotificationRole(oldRole.name) &&
    !isNotificationRole(newRole.name)
  ) {
    const relevantMembers = guild.members.cache
      .filter(
        member =>
          member._roles.includes(newRole.id) && member.id !== getBot().user.id
      )
      .map(member => member)

    if (relevantMembers.length > 0) {
      await addToBatchRoleQueue(newRole.id, {
        addOrRemove: `remove`,
        members: relevantMembers,
        role: newRole,
      })

      const totalQueuedMembers = getTotalBatchRoleQueueMembers()

      if (totalQueuedMembers > 0 && relevantMembers.length > 0) {
        const adminChannelId = await getAdminChannel(guild.id),
          adminChannel = adminChannelId
            ? guild.channels.cache.get(adminChannelId)
            : null

        const alphaRunTime = getExpectedRunTime(totalQueuedMembers)

        await adminChannel?.send(
          `A notification role's name was changed from **${oldRole.name}** to **${newRole.name}**, and is therefore no longer a notification role 🔕` +
            `\nThis role will automatically be removed from ${relevantMembers.length} members in the server.` +
            `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
        )
      }
    }
  }

  if (
    (oldRole.rawPosition !== newRole.rawPosition ||
      oldRole.name !== newRole.name) &&
    newRole.position < botRole.position
  ) {
    setTimeout(() => pushToRoleSortingQueue(guild.id), roleSortPauseDuration)
  }
}

export async function deleteRole(role) {
  const guild = role.guild,
    vipRoleId = await getVipRoleId(guild.id)

  if (role.id === vipRoleId) {
    await setVipRoleId(guild.id, null)

    const adminChannelId = await getAdminChannel(guild.id),
      adminChannel = adminChannelId
        ? guild.channels.cache.get(adminChannelId)
        : null

    if (adminChannel)
      adminChannel.send(
        `The VIP role for this server was just deleted 😬` +
          `\nIf this was on purpose, great. If not, I can't restore it.` +
          `\nVIP functionality in this server will no longer work until you set the VIP role again using the \`/set-vip-role\` command.`
      )
  }

  if (balanceDisrupted(role)) {
    const newRole = await guild.roles.create(role),
      adminChannel = guild.channels.cache.get(await getAdminChannel(guild.id))

    if (adminChannel)
      adminChannel.send(
        `@here` +
          `\nSomeone tried deleting the \`@${newRole.name}\` role, which I need to function 😡` +
          `\n\nIt's okay, I forgive you guys 😇` +
          `\nI recreated the role... but you'll have to re-add it to any channel or member`
      )

    setTimeout(() => pushToRoleSortingQueue(guild.id), roleSortPauseDuration)
  } else if (role.name.match(`^~.+~$`)) {
    await new Promise(resolve => setTimeout(resolve, roleSortPauseDuration))
    announceColorChange(role)
  } else if (isNotificationRole(role.name)) {
    batchRoleQueue.delete(role.id)

    const adminChannelId = await getAdminChannel(guild.id),
      adminChannel = adminChannelId
        ? guild.channels.cache.get(adminChannelId)
        : null

    await adminChannel?.send(`
      Just thought I'd let you guys know that a notification role, **${role.name}**, has been deleted 🔕
    `)
  }
}

export async function batchAddOrRemoveRole(members, role, addOrRemove) {
  if (!role) return

  const guild = role.guild,
    adminChannelId = await getAdminChannel(guild.id),
    adminChannel = adminChannelId
      ? guild.channels.cache.get(adminChannelId)
      : null,
    toOrFrom = addOrRemove === `add` ? `to` : `from`,
    originalMemberCount = members.length

  let counter = 0

  while (members.length !== 0) {
    const member = members.shift()

    if (!guild.roles.cache.has(role.id)) {
      adminChannel?.send(
        `A role was deleted while in the **batch ${addOrRemove}** queue 🤔`
      )

      return false
    }

    for (let i = 0; i < pauseDuation; i++) {
      if (!batchRoleQueue.has(role.id)) {
        if (!guild.roles.cache.has(role.id)) {
          adminChannel?.send(
            `A role was deleted while in the **batch ${addOrRemove}** queue 🤔`
          )

          return false
        } else if (counter > 0)
          adminChannel?.send(
            `The **${role.name}** role has been removed from the **batch ${addOrRemove}** queue 😬` +
              `\nI was able to *${addOrRemove}* **${role.name}** ${toOrFrom} ${counter} members before it was removed from the queue.`
          )

        return
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await member.roles[addOrRemove](role).catch(
      error =>
        `I was unable to ${addOrRemove} ${role.name} ${toOrFrom} user via batch, see error below:\n${error}`
    )

    counter++
  }

  adminChannel?.send(
    `The **batch ${addOrRemove}** queue for **${role.name}** is complete, **${originalMemberCount}** members were affected 👍`
  )

  return true
}

export async function batchRemoveRole(members, role) {
  const guild = role.guild,
    adminChannelId = await getAdminChannel(guild.id),
    adminChannel = adminChannelId
      ? guild.channels.cache.get(adminChannelId)
      : null

  for (const member of members) {
    if (!role) {
      adminChannel?.send(
        `A role was deleted while I was batch removing it from members 🤔`
      )

      return false
    }

    if (member._roles.includes(role.id)) {
      await member.roles
        .remove(role)
        .catch(
          error =>
            `I was unable to remove role from user via batch, see error below:\n${error}`
        )

      await new Promise(resolve => setTimeout(resolve, pauseDuation * 1000))
    }
  }

  adminChannel?.send(
    `I just finished removing the **${role.name}** role from ${members.length} members 👍`
  )

  return true
}

export function getListRoles(guild, type) {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  let formattedRoles, validationFunction

  switch (type) {
    case `colors`:
      validationFunction = `isColorRole`
      break
    case `notifications`:
      validationFunction = `isNotificationRole`
  }

  formattedRoles = guild.roles.cache
    .filter(role => validator[validationFunction](role.name))
    .map(role => {
      return { group: `roles`, values: `<@&${role.id}>`, name: role.name }
    })

  formattedRoles.sort((a, b) => collator.compare(a.name, b.name))

  formattedRoles.forEach(
    (record, index) => (record.values = `${index + 1}. ${record.values}`)
  )

  return formattedRoles
}

export function getRoleByName(roles, roleName) {
  return roles.find(role => role.name === roleName)
}
