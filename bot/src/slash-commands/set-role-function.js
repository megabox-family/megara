import { ApplicationCommandOptionType } from 'discord.js'
import { noCase } from 'change-case'
import {
  getFunctionRoles,
  getVipRoleId,
  setAdminRoleId,
  setChannelNotificationsRoleId,
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
  admin: setAdminRoleId,
  channelNotifications: setChannelNotificationsRoleId,
}

export const description = `Sets the specified role's special function.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `role-function`,
      description: `The function you want to assign to the specified role.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `vip`, value: `vip` },
        { name: `admin`, value: `admin` },
        { name: `channel-notifications`, value: `channelNotifications` },
      ],
    },
    {
      name: `role`,
      description: `The role you want to give the function to.`,
      type: ApplicationCommandOptionType.Role,
      required: true,
      autocomplete: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    roleFunction = options.getString(`role-function`),
    optionRole = options.getRole(`role`),
    functionRoles = await getFunctionRoles(guild.id),
    isAlreadyFunctionRole = Object.keys(functionRoles).find(
      key => functionRoles[key] === optionRole.id
    ),
    existingRoleFunction = isAlreadyFunctionRole
      ? isAlreadyFunctionRole.match(`^[a-z]+`)[0]
      : null

  if (isAlreadyFunctionRole) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${optionRole} is already set as the ${existingRoleFunction} role, and any given role can only have one function 🤔`,
    })

    return
  } else {
    if (roleFunction === `vip`) {
      const { id: vipRoleId } = optionRole,
        vipMemberArray = await getVipMemberArray(guild),
        oldVipRoleId = await getVipRoleId(guild.id),
        oldVipRole = guild.roles.cache.get(oldVipRoleId),
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
          parameters: `The ${optionRole} role has been set as the VIP role 🥇 ${removeMessage}`,
        })
      } else {
        addToBatchRoleQueue(vipRoleId, {
          addOrRemove: `add`,
          members: curratedVipMembers,
          role: optionRole,
        })

        const totalQueuedMembers = getTotalBatchRoleQueueMembers(),
          alphaRunTime = getExpectedRunTime(totalQueuedMembers)

        await queueApiCall({
          apiCall: `editReply`,
          djsObject: interaction,
          parameters:
            `The ${optionRole} role has been set as the VIP role 🥇` +
            `\n${optionRole} will automatically be added to the ${curratedVipMembers.length} boosters / premium subscribers / vip override users in this server.` +
            `\nThere is currently a total of ${totalQueuedMembers} members in the batch role queue, it should take me around ${alphaRunTime} to complete this action 🕑 ${removeMessage}`,
        })
      }
    } else {
      await setCommands[roleFunction](guild.id, optionRole.id)
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `The ${optionRole} role has been set as the ${noCase(
          roleFunction
        )} role! 👍`,
      })
    }
  }
}
