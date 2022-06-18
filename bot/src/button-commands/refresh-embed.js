import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getListInfo, updateListPageData } from '../repositories/lists.js'
import { description } from '../slash-commands/list-cooridnates.js'

export default async function (interaction) {
  const guild = interaction.guild,
    message = interaction.message,
    listInfo = await getListInfo(message.id)

  if (!listInfo) {
    interaction.reply({
      content: `Something went wrong retreiving a page in the list, please dismiss the list message and run the slash command again.`,
      ephemeral: true,
    })

    return
  }

  const recordsPerPage = listInfo.recordsPerPage,
    group = listInfo.groupBy,
    filters = listInfo.filters,
    pages = await getPages(recordsPerPage, group, guild, filters)

  if (pages.length === 0) {
    interaction.reply({
      content: `There was an error refreshing the list, please dismiss the list message and create a new one 😬`,
      ephemeral: true,
    })

    return
  }

  const messageContent = await generateListMessage(
    pages,
    listInfo.title,
    listInfo.description
  )

  await updateListPageData(message.id, pages)

  interaction.update(messageContent)
}
