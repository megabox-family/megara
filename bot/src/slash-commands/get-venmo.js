import { queueApiCall } from '../api-queue.js'
import { addVenmo, getVenmoTag, updateVenmoTag } from '../repositories/venmo.js'
import { getCommandByName } from '../utils/slash-commands.js'

export const description = `Returns the venmo tag currently associated with your discord account.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { user } = interaction,
    existingVenmoTag = await getVenmoTag(user.id),
    setVenmoCommand = getCommandByName(`set-venmo`)

  if (!existingVenmoTag) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `I don't currently have your venmo tag on record 🤔` +
        `\nTo associate a venmo tag with your discord account click here → </set-venmo:${setVenmoCommand.id}> 🤓`,
    })

    return
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `Your venmo tag is currently set to **${existingVenmoTag}** 🤓`,
  })
}
