import { queueApiCall } from '../api-queue.js'
import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'

export const description = `Returns a message displaying the current VIP role set for this server.`
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
      parameters: `**${name}** does not currently have a VIP role set 🤓`,
    })

    return
  }

  const vipRole = roles.cache.get(vipRoleId)

  if (!vipRole) {
    await setVipRoleId(guild.id, null)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `A VIP role ID was set, but the associated role no longer exists. Thus, **${name}** no longer has a VIP role set. 😓`,
    })
  } else {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${vipRole} is currently set as **${name}'s** VIP role 🤓`,
    })
  }
}
