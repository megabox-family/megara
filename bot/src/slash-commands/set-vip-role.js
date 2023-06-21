import { ApplicationCommandOptionType } from 'discord.js'
import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'
import { getVipMemberArray, getExpectedRunTime } from '../utils/members.js'
import {
  addToBatchRoleQueue,
  getTotalBatchRoleQueueMembers,
} from '../utils/roles.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to choose which role in your server represents VIP status.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `role`,
      description: `The role you'd like to set as the VIP role for this server.`,
      type: ApplicationCommandOptionType.Role,
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
    { roles } = guild,
    vipRole = options.getRole(`role`),
    { id: vipRoleId } = vipRole,
    vipMemberArray = await getVipMemberArray(guild),
    oldVipRoleId = await getVipRoleId(guild.id),
    oldVipRole = roles.cache.get(oldVipRoleId),
    oldCurratedVipMembers = vipMemberArray.filter(member =>
      member._roles.includes(oldVipRoleId)
    )

  let removeMessage = ``

  if (oldCurratedVipMembers.length > 0) {
    const totalQueuedMembers = getTotalBatchRoleQueueMembers(),
      alphaRunTime = getExpectedRunTime(totalQueuedMembers)

    addToBatchRoleQueue(oldVipRoleId, {
      addOrRemove: `remove`,
      members: oldCurratedVipMembers,
      role: oldVipRole,
    })

    removeMessage =
      `\n\n${oldVipRole} is no longer the VIP role and will automatically be removed from the ${oldCurratedVipMembers.length} it is assigned to.` +
      `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
  }

  await setVipRoleId(guild.id, vipRoleId)

  const curratedVipMembers = vipMemberArray.filter(
    member => !member._roles.includes(vipRoleId)
  )

  if (curratedVipMembers.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The ${vipRole} role has been set as the VIP role 🥇 ${removeMessage}`,
    })
  } else {
    addToBatchRoleQueue(vipRoleId, {
      addOrRemove: `add`,
      members: curratedVipMembers,
      role: vipRole,
    })

    const totalQueuedMembers = getTotalBatchRoleQueueMembers(),
      alphaRunTime = getExpectedRunTime(totalQueuedMembers)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `The ${vipRole} role has been set as the VIP role 🥇` +
        `\n${vipRole} will automatically be added to the ${curratedVipMembers.length} boosters / premium subscribers / vip override users in this server.` +
        `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑 ${removeMessage}`,
    })
  }
}
