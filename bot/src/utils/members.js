import { batchAddRole } from './roles.js'
import {
  getAdminChannel,
  getVipRoleId,
  setVipRoleId,
} from '../repositories/guilds.js'
import {
  getVipOverriedId,
  getVipUserIdArray,
} from '../repositories/vip-user-overrides.js'

export const pauseDuation = 2

export async function getVipMemberArray(guild) {
  const vipMemberArray = []

  guild.members.cache.forEach(member => {
    const memberHasPremiumRole = member.premiumSinceTimestamp

    if (memberHasPremiumRole) vipMemberArray.push(member)
  })

  const vipUserOverrideIds = await getVipUserIdArray(guild.id)

  vipUserOverrideIds.forEach(vipUserId => {
    const vipUser = guild.members.cache.get(vipUserId)

    if (vipUser) vipMemberArray.push(vipUser)
  })

  return vipMemberArray
}

export function getExpectedRunTime(vipMemberCount) {
  const totalSeconds = vipMemberCount * pauseDuation,
    minutes = Math.floor(totalSeconds / 60),
    seconds = totalSeconds % 60

  let alphaRunTime

  if (minutes === 0) {
    alphaRunTime = `${seconds} seconds`
  } else if (seconds === 0) {
    alphaRunTime = `${minutes} minutes`
  } else {
    alphaRunTime = `${minutes} minutes, and ${seconds} seconds`
  }

  return alphaRunTime
}

export async function syncVipMembers(guild) {
  const vipRoleId = await getVipRoleId(guild.id)

  if (!vipRoleId) return

  const vipRole = guild.roles.cache.get(vipRoleId),
    adminChannelId = await getAdminChannel(guild.id),
    adminChannel = adminChannelId
      ? guild.channels.cache.get(adminChannelId)
      : null

  if (!vipRole) {
    await setVipRoleId(null, guild.id)

    if (adminChannel) {
      adminChannel.send(`
        You have a VIP role ID set, but the cooresponding role no longer exists 😬\
        \nPlease set a new VIP role using the \`/set-vip-roll\` function, until then, VIP functionality is no longer automated.
      `)
    }

    return
  }

  const vipMemberArray = await getVipMemberArray(guild),
    curratedVipMembers = vipMemberArray.filter(
      member => !member._roles.includes(vipRole.id)
    )

  if (curratedVipMembers.length === 0) return

  const alphaRunTime = getExpectedRunTime(curratedVipMembers.length)

  adminChannel.send(
    `Some VIP members do not have the VIP role, attributing ${curratedVipMembers.length} member(s) the VIP role, this will take around ${alphaRunTime} to finish 🕑`
  )

  batchAddRole(curratedVipMembers, vipRole.id)
}

export async function handlePremiumRole(oldMember, newMember) {
  const guild = newMember.guild,
    wasPremium = oldMember.premiumSinceTimestamp,
    isPremium = newMember.premiumSinceTimestamp

  if ((!wasPremium && !isPremium) || (wasPremium && isPremium)) return

  const vipRoleId = await getVipRoleId(guild.id)

  if (!vipRoleId) return

  const vipRole = guild.roles.cache.get(vipRoleId)

  if (!vipRole) {
    await setVipRoleId(null, guild.Id)

    const adminChannelId = await getAdminChannel(guild.id),
      adminChannel = adminChannelId
        ? guild.channels.cache.get(adminChannelId)
        : null

    if (adminChannel)
      adminChannel.send(`
        We weren't able to asign the VIP role for this server to ${newMember}.\
        \nThe VIP role ID was set, but the role itself no longer exists in this server, we have cleared the ID from the VIP role table.
        \nPlease use the \`/set-vip-role\` command to set a new VIP role, until you do, automated VIP functionality will no longer work in this server.
      `)

    return
  }

  const memberHasVipRole = newMember._roles.includes(vipRole.id)

  if (!wasPremium && isPremium) {
    if (!memberHasVipRole) newMember.roles.add(vipRole)
  } else {
    const memberVipOverrideId = await getVipOverriedId(newMember.id, guild.id)

    if (!memberVipOverrideId && memberHasVipRole)
      newMember.roles.remove(vipRole)
  }
}
