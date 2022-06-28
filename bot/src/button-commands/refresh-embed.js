import { directMessageError } from '../utils/error-logging.js'
import { getPages, generateListMessage } from '../utils/slash-commands.js'
import {
  getColorButtons,
  getChannelButtons,
  getNotificationButtons,
} from '../utils/buttons.js'
import { getListInfo, updateListPageData } from '../repositories/lists.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const guild = interaction.guild,
    message = interaction.message,
    member = interaction.member,
    listInfo = await getListInfo(message.id)

  if (!listInfo) {
    member
      .send({
        content: `Something went wrong retreiving a page in the list, please dismiss the list message and run the slash command again.`,
        ephemeral: true,
      })
      .catch(error => directMessageError(error, member))

    return
  }

  const recordsPerPage = listInfo.recordsPerPage,
    group = listInfo.groupBy,
    filters = listInfo.filters,
    pages = await getPages(recordsPerPage, group, guild, filters)

  if (pages.length === 0) {
    member
      .send({
        content: `There was an error refreshing the list, please dismiss the list message and create a new one 😬`,
        ephemeral: true,
      })
      .catch(error => directMessageError(error, member))

    return
  }

  const messageContent = await generateListMessage(
    pages,
    listInfo.title,
    listInfo.description
  )

  const groupBy = listInfo.groupBy

  let otherButtons

  if (groupBy === `roles-color`)
    otherButtons = getColorButtons(pages[0], member._roles)
  if (groupBy === `roles-notifications`)
    otherButtons = getNotificationButtons(pages[0], member._roles)
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

  await interaction.editReply(messageContent)
}
