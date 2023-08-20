import { ApplicationCommandOptionType } from 'discord.js'
import { pushToRoleSortingQueue } from '../utils/roles.js'
import { setChannelSorting, setRoleSorting } from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'
import { pushToChannelSortingQueue } from '../utils/channels.js'

export const description = `Enables or disables automatic sorting for channels and roles.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `what-to-sort`,
      description: `What you'd like to turn sorting on for.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'channels', value: 'channels' },
        { name: 'roles', value: 'roles' },
      ],
    },
    {
      name: `enable-sorting`,
      description: `True enables sorting, false disables sorting.`,
      type: ApplicationCommandOptionType.Boolean,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    options = interaction.options,
    whatToSort = options.getString(`what-to-sort`),
    enableSorting = options.getBoolean(`enable-sorting`)

  if (whatToSort.toLowerCase() === `channels`)
    await setChannelSorting(guild.id, enableSorting)
  else await setRoleSorting(guild.id, enableSorting)

  const formatedSortingType = `${whatToSort.charAt(0).toUpperCase()}${whatToSort
    .substring(1, whatToSort.length - 1)
    .toLowerCase()}`

  if (enableSorting) {
    if (whatToSort.toLowerCase() === `channels`)
      pushToChannelSortingQueue({ guildId: guild.id, bypassComparison: true })
    else pushToRoleSortingQueue(guild.id)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${formatedSortingType} sorting has been enabled, watch em sort! 🤩`,
    })
  } else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${formatedSortingType} sorting has been disabled, have fun sorting them yourself 😜`,
    })
}
