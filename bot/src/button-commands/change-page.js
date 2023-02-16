import { EmbedBuilder } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import {
  toggleListButtons,
  getColorButtons,
  getChannelButtons,
  getNotificationButtons,
} from '../utils/buttons.js'
import { getGroupBy, getPageData } from '../repositories/lists.js'
import { getformattedChannelPages } from '../utils/general-commands.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const guild = interaction.guild,
    member = interaction.member,
    message = interaction.message,
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

  let ammountOfPages = interaction.customId.match(`(?<=:\\s)-?[0-9A-Za-z]+`)[0]

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
  let displayPages

  if (
    [`channels-joinable`, `channels-public`, `channels-archived`].includes(
      groupBy
    )
  ){
    displayPages = getformattedChannelPages(pages)
  }

  const newPage = pages[newPageNo - 1],
    displayPage = displayPages ? displayPages[newPageNo - 1] : newPage,
    newEmbed = new EmbedBuilder()
      .setColor(existingEmbed.color)
      .setTitle(existingEmbed.title)
      .setDescription(existingEmbed.description)
      .addFields(displayPage)
      .setFooter({ text: `Page ${newPageNo} of ${totalPages}` })
      .setTimestamp(),
    paginationButtons = await toggleListButtons(
      newPageNo,
      totalPages,
      message.components[0]
    )



  let otherButtons

  if (groupBy === `roles-color`)
    otherButtons = getColorButtons(newPage, member._roles)
  else if (groupBy === `roles-notifications`)
    otherButtons = getNotificationButtons(newPage, member._roles)
  else if (
      [`channels-joinable`, `channels-public`, `channels-archived`].includes(
        groupBy
      )
    ){
      otherButtons = getChannelButtons(
        newPage,
        member.id,
        guild.channels.cache,
        groupBy
      )
    }

  const newComponents = otherButtons
    ? [paginationButtons, ...otherButtons]
    : [paginationButtons]

  await interaction.editReply({ embeds: [newEmbed], components: newComponents })
}
