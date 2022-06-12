import {
  defaultRecordsPerPage,
  getPages,
  generateListMessage,
} from '../utils/slash-commands.js'
import { createList } from '../repositories/lists.js'

export const description = `Shows you all the Minecraft worlds within this Discord server.`
export const defaultPermission = false,
  options = [
    {
      name: `records-per-page`,
      description: `The total number of values you'd like to show per page (default is 20).`,
      type: `INTEGER`,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    _recordsPerPage = options.getInteger(`records-per-page`),
    recordsPerPage = _recordsPerPage ? _recordsPerPage : defaultRecordsPerPage,
    group = `worlds-world`,
    pages = await getPages(recordsPerPage, group, guild)

  if (pages.length === 0) {
    interaction.reply({
      content: `The are no Minecraft worlds in **${guild.name}** to list 🤔`,
      ephemeral: true,
    })

    return
  }

  const title = `Minecraft Worlds`

  const messageContents = await generateListMessage(pages, title)

  await interaction.reply(messageContents)

  const message = await interaction.fetchReply()

  createList(message.id, title, null, pages, recordsPerPage, group)
}
