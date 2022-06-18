import { pushToChannelSortingQueue } from '../utils/channels.js'
import { pushToRoleSortingQueue } from '../utils/roles.js'
import { setChannelSorting, setRoleSorting } from '../repositories/guilds.js'

export const description = `Enables or disables automatic sorting for channels and roles.`
export const defaultPermission = false,
  options = [
    {
      name: `what-to-sort`,
      description: `What you'd like to turn sorting on for.`,
      type: `STRING`,
      required: true,
      choices: [
        { name: 'channels', value: 'channels' },
        { name: 'roles', value: 'roles' },
      ],
    },
    {
      name: `enable-sorting`,
      description: `True enables sorting, false disables sorting.`,
      type: `BOOLEAN`,
      required: true,
    },
  ]

export default async function (interaction) {
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
      pushToChannelSortingQueue(guild.id)
    else pushToRoleSortingQueue(guild.id)

    interaction.reply({
      content: `${formatedSortingType} sorting has been enabled, watch em sort! 🤩`,
      ephemeral: true,
    })
  } else
    interaction.reply({
      content: `${formatedSortingType} sorting has been disabled, have fun sorting them yourself 😜`,
      ephemeral: true,
    })
}