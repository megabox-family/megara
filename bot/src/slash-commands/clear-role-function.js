import { ApplicationCommandOptionType } from 'discord.js'
import { noCase } from 'change-case'
import {
  getFunctionRoles,
  setAdminRoleId,
  setUndergoingVerificationRoleId,
  setVerifiedRoleId,
  setVipRoleId,
} from '../repositories/guilds.js'
import { getExpectedRunTime, getVipMemberArray } from '../utils/members.js'
import {
  addToBatchRoleQueue,
  getTotalBatchRoleQueueMembers,
} from '../utils/roles.js'
import { queueApiCall } from '../api-queue.js'

const setCommands = {
  vip: setVipRoleId,
  verified: setVerifiedRoleId,
  undergoingVerification: setUndergoingVerificationRoleId,
  admin: setAdminRoleId,
}

export const description = `Removes a special function from the role it's assignd to.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `role-function`,
      description: `The function you'd like to clear from it's currently assigned role.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `vip`, value: `vip` },
        { name: `verified`, value: `verified` },
        { name: `undergoing-verification`, value: `undergoingVerification` },
        { name: `admin`, value: `admin` },
      ],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    { id: guildId, roles } = guild,
    roleFunction = options.getString(`role-function`),
    functionRoles = await getFunctionRoles(guildId),
    oldRoleId = functionRoles?.[`${roleFunction}RoleId`],
    oldRole = roles.cache.get(oldRoleId)

  if (!oldRoleId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There is no role set for the ${roleFunction} function 🤔`,
    })

    return
  }

  if (!oldRole) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The role previously set to the ${roleFunction} function no longer exists, but I cleared the association on my end 💾`,
    })
  } else {
    let removeMessage = ``
    if (roleFunction === `vip`) {
      const vipMemberArray = await getVipMemberArray(guild),
        oldCurratedVipMembers = vipMemberArray.filter(member =>
          member._roles.includes(oldRoleId)
        )

      if (oldCurratedVipMembers.length > 0) {
        const totalQueuedMembers = getTotalBatchRoleQueueMembers(),
          alphaRunTime = getExpectedRunTime(totalQueuedMembers)

        addToBatchRoleQueue(oldRoleId, {
          addOrRemove: `remove`,
          members: oldCurratedVipMembers,
          role: oldRole,
        })

        removeMessage =
          `\n\n${oldRole} is no longer the VIP role and will automatically be removed from the ${oldCurratedVipMembers.length} it is assigned to.` +
          `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑`
      }
    }

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `I've removed the ${noCase(
        roleFunction
      )} function from ${oldRole} 🫡${removeMessage}`,
    })
  }

  await setCommands[roleFunction](guildId, null)
}
