import { ApplicationCommandOptionType } from 'discord.js'
import {
  defaultRecordsPerPage,
  generateListMessage,
  getPages,
} from '../utils/slash-commands.js'
import { queueApiCall } from '../api-queue.js'
import { createList } from '../repositories/lists.js'

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
    groupBy = `position-overrides`,
    pages = await getPages({ recordsPerPage, groupBy, guild })

  if (pages?.length === 0 || !pages) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `No position overrides have been set 🤔`,
    })

    return
  }

  const title = `position overrides`,
    messageContents = await generateListMessage({ pages, title })

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
