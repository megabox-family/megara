import { queueApiCall } from '../api-queue.js'
import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'
import { getExpectedRunTime, getVipMemberArray } from '../utils/members.js'
import {
  addToBatchRoleQueue,
  getTotalBatchRoleQueueMembers,
} from '../utils/roles.js'

export const description = `Clears the VIP role set for this server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild } = interaction,
    { name, roles } = guild,
    vipRoleId = await getVipRoleId(guild.id)

  if (!vipRoleId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There is no VIP role set in **${name}** 🤔`,
    })
  } else {
    const oldVipRole = roles.cache.get(vipRoleId),
      vipMemberArray = await getVipMemberArray(guild),
      oldCurratedVipMembers = vipMemberArray.filter(member =>
        member._roles.includes(vipRoleId)
      )

    let removeMessage = ``

    if (oldCurratedVipMembers.length > 0) {
      const totalQueuedMembers = getTotalBatchRoleQueueMembers(),
        alphaRunTime = getExpectedRunTime(totalQueuedMembers)

      addToBatchRoleQueue(vipRoleId, {
        addOrRemove: `remove`,
        members: oldCurratedVipMembers,
        role: oldVipRole,
      })

      removeMessage =
        `\n\n${oldVipRole} is no longer the VIP role and will automatically be removed from the ${oldCurratedVipMembers.length} it is assigned to.` +
        `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
    }

    await setVipRoleId(guild.id, null)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${oldVipRole} is no longer set as the VIP role in **${name}** 👍${removeMessage}`,
    })
  }
}
