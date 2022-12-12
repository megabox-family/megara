import { ApplicationCommandOptionType } from 'discord.js'
import { getPages, generateListMessage } from '../utils/slash-commands.js'
import { getChannelButtons } from '../utils/buttons.js'
import { createList } from '../repositories/lists.js'

export const description = `Displays a list of a specific type of channels within the server (joinable, public, archived).`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel-type`,
      description: `The type of channels you want to be listed.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `joinable`, value: `Joinable` },
        { name: `public`, value: `Public` },
        { name: `archived`, value: `Archived` },
      ],
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    options = interaction.options,
    channelType = options.getString(`channel-type`),
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
