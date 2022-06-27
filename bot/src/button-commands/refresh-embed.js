import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getColorButtons, getChannelButtons } from '../utils/buttons.js'
import { getListInfo, updateListPageData } from '../repositories/lists.js'

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
    ),
    member = interaction.member

  const groupBy = listInfo.groupBy

  let otherButtons

  if (groupBy === `roles-color`)
    otherButtons = getColorButtons(pages[0], member._roles)
  else if (
    [`channels-joinable`, `channels-public`, `channels-archived`].includes(
      groupBy
    )
  )
    otherButtons = getChannelButtons(
      pages[0],
      member.id,
      guild.channels.cache,
      groupBy
    )

  const paginationButtons = messageContent.components[0],
    newComponents = otherButtons
      ? [paginationButtons, ...otherButtons]
      : [paginationButtons]

  messageContent.components = newComponents

  await updateListPageData(message.id, pages)

  interaction.update(messageContent)
}
