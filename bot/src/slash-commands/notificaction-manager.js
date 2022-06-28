import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getColorButtons, getNotificationButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'

export const description = `Displays a list of colors that you can choose from to change your name color.`,
  defaultPermission = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    groupBy = `roles-notifications`,
    recordLimit = 21,
    pages = await getPages(recordLimit, groupBy, guild),
    title = `Notification Manager`,
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
