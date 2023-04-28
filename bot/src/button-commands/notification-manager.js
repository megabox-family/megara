import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getNotificationButtons } from '../utils/buttons.js'
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
    groupBy = `roles-notifications`,
    recordLimit = 21,
    pages = await getPages(recordLimit, groupBy, guild)

  if (!pages) {
    await interaction.editReply(
      `There are currently no notification roles in ${guild} 😔`
    )

    return
  }

  const title = `Notification Manager`,
    description = `Press the cooresponding button to suscribe or\n unsubscribe from certain notifications.`,
    listMessage = await generateListMessage(pages, title, description),
    notificationButtonComponents = getNotificationButtons(
      pages[0],
      member._roles
    )

  listMessage.components = [
    ...listMessage.components,
    ...notificationButtonComponents,
  ]

  await interaction.editReply(listMessage)

  const message = await interaction.fetchReply()

  await createList(message.id, title, description, pages, recordLimit, groupBy)
}
