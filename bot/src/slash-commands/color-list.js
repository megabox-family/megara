import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getColorButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'

export const description = `Displays a list of colors that you can choose from to change your name color.`,
  dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    groupBy = `roles-color`,
    recordLimit = 21,
    pages = await getPages(recordLimit, groupBy, guild),
    title = `Colors`,
    description = `Press the cooresponding button to set or remove \nyour name color.`,
    listMessage = await generateListMessage(pages, title, description),
    colorButtonComponents = getColorButtons(pages[0], member._roles)

  listMessage.components = [...listMessage.components, ...colorButtonComponents]

  await interaction.editReply(listMessage)

  const message = await interaction.fetchReply()

  createList(message.id, title, description, pages, recordLimit, groupBy)
}
