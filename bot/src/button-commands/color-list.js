import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getColorButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    member = interaction.member,
    groupBy = `roles-color`,
    recordLimit = 21,
    pages = await getPages(recordLimit, groupBy, guild)

  if (!pages) {
    await interaction.editReply(
      `There are currently no color roles in ${guild} 😔`
    )

    return
  }

  const title = `Colors`,
    description = `Press the cooresponding button to set or remove \nyour name color.`,
    listMessage = await generateListMessage(pages, title, description),
    colorButtonComponents = getColorButtons(pages[0], member._roles)

  listMessage.components = [...listMessage.components, ...colorButtonComponents]

  const message = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: listMessage,
  })

  createList(message.id, title, description, pages, recordLimit, groupBy)
}
