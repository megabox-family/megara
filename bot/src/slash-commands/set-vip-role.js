import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'
import { getVipMemberArray, getExpectedRunTime } from '../utils/members.js'
import { batchAddRole, batchRemoveRole } from '../utils/roles.js'

export const description = `Allows you to manually attribute the contributor role regardless of premium or nitro status.`
export const defaultPermission = false,
  options = [
    {
      name: `vip-role-id`,
      description: `The id of the role you'd like to represent this guild VIP role (input 'null' to clear).`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    _vipRoleId = options.getString(`vip-role-id`).toLowerCase(),
    vipRoleId = _vipRoleId === `null` ? null : _vipRoleId,
    oldVipRoleId = await getVipRoleId(guild.id),
    vipMemberArray = await getVipMemberArray(guild)

  if (!vipRoleId && !oldVipRoleId) {
    await interaction.editReply({
      content: `You don't have a VIP role set, there is nothing to clear 🤔`,
    })

    return
  }

  if (!vipRoleId) {
    await setVipRoleId(vipRoleId, guild.id)

    const oldVipRole = guild.roles.cache.get(oldVipRoleId)

    if (!oldVipRole) {
      await interaction.editReply({
        content: `You no longer have a VIP role set on this server, VIP functionality will no longer work 😬`,
      })

      return
    }

    const curratedVipMembers = vipMemberArray.filter(member =>
      member._roles.includes(oldVipRole.id)
    )

    if (!oldVipRole || curratedVipMembers.length === 0) {
      await interaction.editReply({
        content: `You no longer have a VIP role set on this server, VIP functionality will no longer work 😬`,
      })

      return
    } else {
      const alphaRunTime = getExpectedRunTime(curratedVipMembers.length)

      await interaction.editReply({
        content: `
          The ${oldVipRole} role has been cleared for this server 🧼\
          \nThis role will automatically be removed from the ${curratedVipMembers.length} boosters / premium subscribers / vip override users in this server.\
          \nHowever, it's going to take around ${alphaRunTime} to finish 🕑
        `,
      })

      batchRemoveRole(curratedVipMembers, oldVipRole.id)
    }
  } else {
    const vipRole = guild.roles.cache.get(vipRoleId)

    if (!vipRole) {
      await interaction.editReply({
        content: `You provided an invalid role ID, please try again 🤔`,
      })

      return
    }

    await setVipRoleId(vipRoleId, guild.id)

    const curratedVipMembers = vipMemberArray.filter(
      member => !member._roles.includes(vipRole.id)
    )

    if (curratedVipMembers.length === 0) {
      await interaction.editReply({
        content: `The ${vipRole} role has been set as the VIP role 🥇`,
      })
    } else {
      const alphaRunTime = getExpectedRunTime(curratedVipMembers.length)

      await interaction.editReply({
        content: `
          The ${vipRole} role has been set as the VIP role 🥇\
          \nThis role will automatically be added to the ${curratedVipMembers.length} boosters / premium subscribers / vip override users in this server.\
          \nHowever, it's going to take around ${alphaRunTime} to finish 🕑
        `,
      })

      batchAddRole(curratedVipMembers, vipRole.id)
    }
  }
}
