import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getChannelButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'

export default async function (interaction) {
  const channelType = interaction.customId.match(`(?<=: )([A-Z]|[a-z])+`)[0]

  await interaction.deferReply({ ephemeral: true })

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
    listMessage = await generateListMessage(pages, title, description),
    channelButtonComponents = getChannelButtons(
      pages[0],
      member.id,
      guild.channels.cache,
      groupBy
    )

  listMessage.components = [
    ...listMessage.components,
    ...channelButtonComponents,
  ]

  await interaction.editReply(listMessage)

  const message = await interaction.fetchReply()

  createList(message.id, title, description, pages, recordLimit, groupBy)
}
