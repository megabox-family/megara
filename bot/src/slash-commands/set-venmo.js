import { ApplicationCommandOptionType } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { addVenmo, getVenmoTag, updateVenmoTag } from '../repositories/venmo.js'

export const description = `Allows you to associate your venmo tag with your discord account.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `venmo-tag`,
      description: `Your venmo tag (example: brittany18).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { options, user } = interaction,
    existingVenmoTag = await getVenmoTag(user.id),
    _venmoTag = options.getString(`venmo-tag`),
    venmoTag = _venmoTag.startsWith(`@`) ? _venmoTag : `@${_venmoTag}`

  if (existingVenmoTag) await updateVenmoTag(user.id, venmoTag)
  else await addVenmo(user.id, venmoTag)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `Your venmo tag as been set to **${venmoTag}** 🙌`,
  })
}
