import {
  handlePremiumRole,
  handlePremiumSub,
  handleVipRole,
} from '../utils/members.js'

export async function handleMemberUpdate(oldMember, newMember) {
  await handlePremiumRole(oldMember, newMember)
  await handleVipRole(oldMember, newMember)
  await handlePremiumSub(oldMember, newMember)
}
