import { getUndergoingVerificationRoleId } from '../repositories/guilds.js'
import {
  handlePremiumRole,
  handlePremiumSub,
  handleVipRole,
  verifyNewMember,
} from '../utils/members.js'

export async function handleMemberAdd(member) {
  const { guild } = guildMember,
    undergoingVerificationRoleId = await getUndergoingVerificationRoleId(
      guild.id
    )

  if (!undergoingVerificationRoleId) return

  await guildMember.roles.add(undergoingVerificationRoleId)
}

export async function handleMemberUpdate(oldMember, newMember) {
  await verifyNewMember(oldMember, newMember)
  await handlePremiumRole(oldMember, newMember)
  await handleVipRole(oldMember, newMember)
  await handlePremiumSub(oldMember, newMember)
}

export async function handleMemberDelete(member) {}
