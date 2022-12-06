import { ApplicationCommandOptionType } from 'discord.js'
import {
  getVipOverriedId,
  addUserToVipOverrides,
  removeUserFromVipOverrides,
} from '../repositories/vip-user-overrides.js'
import { getVipRoleId, setVipRoleId } from '../repositories/guilds.js'

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
      name: `user-id`,
      description: `The id of the user you'd like to add or remove from the override list.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    vipRoleId = await getVipRoleId(guild.id)

  if (!vipRoleId) {
    await interaction.editReply({
      content: `There is no VIP role set for this server, please set the VIP role using the \`/set-vip-role\` command before using the \`/vip-user-override\` command 🤔`,
    })

    return
  }

  const vipRole = guild.roles.cache.get(vipRoleId)

  if (!vipRole) {
    await setVipRoleId(null, guild.id)

    await interaction.editReply({
      content: `
        The ID for the VIP role exists for this guild, but the role no longer exists. 🤔\
        \nBecause of this, the VIP role ID for this server has been removed.\ 
        \nPlease set a new VIP role using \`/set-vip-role\` before using \`/vip-user-override\`.
      `,
    })

    return
  }

  const options = interaction.options,
    addOrRemove = options.getString(`add-or-remove`),
    vipUserId = options.getString(`user-id`),
    vipMember = guild.members.cache.get(vipUserId)

  if (!vipMember) {
    await interaction.editReply({
      content: `You provided an invalid user id, please try again.`,
    })

    return
  }

  const userVipOverrideId = await getVipOverriedId(vipUserId, guild.id),
    memberHasVipRole = vipMember._roles.includes(vipRole.id)

  if (addOrRemove === `add`) {
    if (userVipOverrideId) {
      await interaction.editReply({
        content: `${vipMember} is already in the VIP override list 🤔`,
      })

      return
    }

    await addUserToVipOverrides(vipUserId, guild.id)

    if (!memberHasVipRole) await vipMember.roles.add(vipRole)

    await interaction.editReply({
      content: `${vipMember} has been added to the VIP User Overrides list and attributed the ${vipRole} role 😁`,
      ephemeral: true,
    })
  } else {
    if (!userVipOverrideId) {
      await interaction.editReply({
        content: `${vipMember} isn't in the VIP User Overrides list 🤔`,
      })

      return
    }

    await removeUserFromVipOverrides(userVipOverrideId)

    const memberHasPremiumRole = vipMember.premiumSinceTimestamp

    if (memberHasPremiumRole) {
      await interaction.editReply({
        content: `${vipMember} has been removed to the VIP User Overrides list but will retain the ${vipRole} role as they are currently a booster or premium subscriber 👍`,
      })

      return
    }

    if (memberHasVipRole) await vipMember.roles.remove(vipRole)

    await interaction.editReply({
      content: `${vipMember} has been removed to the VIP User Overrides list and the ${vipRole} role has been removed from their user 👋`,
    })
  }
}
