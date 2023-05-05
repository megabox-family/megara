import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getChannelButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'
import { getformattedChannelPages } from '../utils/general-commands.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  const channelType = interaction.customId.match(`(?<=: )([A-Z]|[a-z])+`)[0]

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    member = interaction.member,
    groupBy = `channels-${channelType}`.toLowerCase(),
    recordLimit = 21,
    pages = await getPages(recordLimit, groupBy, guild)

  if (!pages) {
    await interaction.editReply(
      `There are currently no ${channelType} channels in ${guild} 😔`
    )

    return
  }

  const title = `${channelType} Channels`,
    description = `Press the cooresponding button to join and leave \nlisted channels.`,
    channelButtonComponents = getChannelButtons(
      pages[0],
      member.id,
      guild.channels.cache,
      groupBy
    ),
    formattedPages = getformattedChannelPages(pages),
    listMessage = await generateListMessage(formattedPages, title, description)

  listMessage.components = [
    ...listMessage.components,
    ...channelButtonComponents,
  ]

  const message = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: listMessage,
  })

  createList(message.id, title, description, pages, recordLimit, groupBy)
}
