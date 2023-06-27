import { ApplicationCommandOptionType } from 'discord.js'
import {
  getVipOverriedId,
  addUserToVipOverrides,
  removeUserFromVipOverrides,
} from '../repositories/vip-user-overrides.js'
import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to manually attribute the contributor role regardless of premium or nitro status.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `add-or-remove`,
      description: `Select add to add a user to the overrides, select remove to remove a user from the overrides.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `add`, value: `add` },
        { name: `remove`, value: `remove` },
      ],
    },
    {
      name: `user`,
      description: `The user you'd like to add or remove from the override list.`,
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    vipRoleId = await getVipRoleId(guild.id)

  if (!vipRoleId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There is no VIP role set for this server, please set the VIP role using the \`/set-vip-role\` command before using the \`/vip-user-override\` command 🤔`,
    })

    return
  }

  const vipRole = guild.roles.cache.get(vipRoleId)

  if (!vipRole) {
    await setVipRoleId(guild.id, null)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `The ID for the VIP role exists for this guild, but the role no longer exists. 🤔` +
        `\nBecause of this, the VIP role ID for this server has been removed.` +
        `\nPlease set a new VIP role using \`/set-vip-role\` before using \`/vip-user-override\`.`,
    })

    return
  }

  const addOrRemove = options.getString(`add-or-remove`),
    vipUser = options.getUser(`user`),
    { id: vipUserId } = vipUser,
    vipMember = guild.members.cache.get(vipUserId),
    userVipOverrideId = await getVipOverriedId(vipUserId, guild.id),
    memberHasVipRole = vipMember._roles.includes(vipRole.id)

  if (addOrRemove === `add`) {
    if (userVipOverrideId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `${vipMember} is already in the VIP override list 🤔`,
      })

      return
    }

    await addUserToVipOverrides(vipUserId, guild.id)

    if (!memberHasVipRole) await vipMember.roles.add(vipRole)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${vipMember} has been added to the VIP User Overrides list and attributed the ${vipRole} role 😁`,
    })
  } else {
    if (!userVipOverrideId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `${vipMember} isn't in the VIP User Overrides list 🤔`,
      })

      return
    }

    await removeUserFromVipOverrides(userVipOverrideId)

    const memberHasPremiumRole = vipMember.premiumSinceTimestamp

    if (memberHasPremiumRole) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `${vipMember} has been removed to the VIP User Overrides list but will retain the ${vipRole} role as they are currently a booster or premium subscriber 👍`,
      })

      return
    }

    if (memberHasVipRole) await vipMember.roles.remove(vipRole)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${vipMember} has been removed to the VIP User Overrides list and the ${vipRole} role has been removed from their user 👋`,
    })
  }
}
