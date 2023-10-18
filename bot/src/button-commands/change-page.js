import { EmbedBuilder } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { toggleListButtons } from '../utils/buttons.js'
import { getGroupBy, getPageData } from '../repositories/lists.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
  })

  const { member, message, customId } = interaction,
    pages = await getPageData(message.id)

  if (!pages) {
    member
      .send({
        content: `Something went wrong retreiving a page in the list, please dismiss the list message and run the slash command again.`,
        ephemeral: true,
      })
      .catch(error => directMessageError(error, member))

    return
  }

  const totalPages = +pages.length

  let ammountOfPages = customId.match(`(?<=:\\s)-?[0-9A-Za-z]+`)[0]

  switch (ammountOfPages) {
    case `first`:
      ammountOfPages = totalPages * -1
      break
    case `last`:
      ammountOfPages = totalPages
      break
    default:
      ammountOfPages = +ammountOfPages
  }

  const existingEmbed = message.embeds[0],
    existingFooter = existingEmbed.footer,
    currentPage = +existingFooter.text.match(`[0-9]+(?=\\sof)`),
    _newPageNo = currentPage + ammountOfPages

  let newPageNo

  if (ammountOfPages > 0)
    newPageNo = _newPageNo > totalPages ? totalPages : _newPageNo
  else newPageNo = _newPageNo <= 0 ? 1 : _newPageNo

  const groupBy = await getGroupBy(message.id)

  const newPage = pages[newPageNo - 1],
    newEmbed = new EmbedBuilder()
      .setColor(existingEmbed.color)
      .setTitle(existingEmbed.title)
      .setDescription(existingEmbed.description)
      .addFields(newPage)
      .setFooter({ text: `Page ${newPageNo} of ${totalPages}` })
      .setTimestamp(),
    paginationButtons = await toggleListButtons(
      newPageNo,
      totalPages,
      message.components[0]
    )

  const newComponents = [paginationButtons]

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { embeds: [newEmbed], components: newComponents },
  })
}
