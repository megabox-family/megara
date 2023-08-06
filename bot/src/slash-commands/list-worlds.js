import { ApplicationCommandOptionType } from 'discord.js'
import {
  defaultRecordsPerPage,
  getPages,
  generateListMessage,
} from '../utils/slash-commands.js'
import { createList } from '../repositories/lists.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Shows you all the Minecraft worlds within this Discord server.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `records-per-page`,
      description: `The total number of values you'd like to show per page (default is 20).`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    _recordsPerPage = options.getInteger(`records-per-page`),
    recordsPerPage = _recordsPerPage ? _recordsPerPage : defaultRecordsPerPage,
    groupBy = `worlds-world`,
    pages = await getPages({ recordsPerPage, groupBy, guild })

  if (pages.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There are no Minecraft worlds in **${guild.name}** to list 🤔`,
    })

    return
  }

  const title = `minecraft worlds`

  const messageContents = await generateListMessage({ pages, title })

  const message = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageContents,
  })

  await createList({
    id: message.id,
    title,
    pages,
    recordsPerPage,
    groupBy,
  })
}
