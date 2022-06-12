import { MessageEmbed } from 'discord.js'
import { toggleListButtons } from '../utils/buttons.js'
import { getPageData } from '../repositories/lists.js'

export default async function (interaction) {
  const message = interaction.message,
    pages = await getPageData(message.id)

  if (!pages) {
    interaction.reply({
      content: `Something went wrong retreiving a page in the list, please dismiss the list message and run the slash command again.`,
      ephemeral: true,
    })

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
    _newPage = currentPage + ammountOfPages

  let newPage

  if (ammountOfPages > 0)
    newPage = _newPage > totalPages ? totalPages : _newPage
  else newPage = _newPage <= 0 ? 1 : _newPage

  const newEmbed = new MessageEmbed()
      .setColor(existingEmbed.color)
      .setTitle(existingEmbed.title)
      .setDescription(existingEmbed.description)
      .addFields(pages[newPage - 1])
      .setFooter({ text: `Page ${newPage} of ${totalPages}` })
      .setTimestamp(),
    newComponents = await toggleListButtons(
      newPage,
      totalPages,
      message.components
    )

  interaction.update({ embeds: [newEmbed], components: newComponents })
}

// (?<=\/)[0-9]+ total pages
