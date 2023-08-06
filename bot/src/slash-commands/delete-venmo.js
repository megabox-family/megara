import { queueApiCall } from '../api-queue.js'
import { getVenmoTag, deleteVenmo } from '../repositories/venmo.js'

export const description = `Dissociates your venmo tag with your discord account.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { user } = interaction,
    existingVenmoTag = await getVenmoTag(user.id)

  if (!existingVenmoTag) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `I don't currently have your venmo tag on record, there is nothing to delete 🤔`,
    })

    return
  }

  await deleteVenmo(user.id)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The association with your venmo tag has been deleted 😔`,
  })
}
