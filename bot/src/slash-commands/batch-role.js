import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { extractElement } from '../utils/general.js'
import { checkIfChannelIsSuggestedType } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Adds or removes the specified role to all users in the server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `add-or-remove`,
      description: `Whether you'd like to add or remove the selcted role`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `vip`, value: `vip` },
        { name: `admin`, value: `admin` },
      ],
    },
    {
      name: `role`,
      description: `The role to add or remove`,
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
  ]

export default async function (interaction) {
  const { guild } = interaction

  // addToBatchRoleQueue(oldRoleId, {
  //   addOrRemove: `remove`,
  //   members: oldCurratedVipMembers,
  //   role: oldRole,
  // })

  // addToBatchRoleQueue(oldRoleId, {
  //   addOrRemove: `remove`,
  //   members: oldCurratedVipMembers,
  //   role: oldRole,
  // })
}
