import {
  defaultRecordsPerPage,
  getPages,
  generateListMessage,
} from '../utils/slash-commands.js'
import {
  getWorldId,
  getCoordinatesUserId,
} from '../repositories/coordinates.js'
import { createList } from '../repositories/lists.js'

export const description = `Shows you all the Minecraft coordinates within various groups.`
export const defaultPermission = false,
  options = [
    {
      name: `group-by`,
      description: `What you'd like to group the cooridinates by.`,
      type: `STRING`,
      required: true,
      choices: [
        { name: `world`, value: `coordinates-world` },
        { name: `user`, value: `coordinates-user` },
        { name: `all coordinates`, value: `coordinates-all` },
      ],
    },
    {
      name: `world-filter`,
      description: `Only show cooridinates for the specified world (enter world name here).`,
      type: `STRING`,
      required: false,
    },
    {
      name: `only-my-coordinates`,
      description: `If true only coordinates you've entered will be listed, if false all user's cooridinates will list.`,
      type: `BOOLEAN`,
      required: false,
    },
    {
      name: `records-per-page`,
      description: `The total number of values you'd like to show per page (default is 20).`,
      type: `INTEGER`,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    options = interaction.options,
    groupBy = options.getString(`group-by`),
    _worldFilter = options.getString(`world-filter`),
    worldFilter = _worldFilter ? _worldFilter : `all`

  if (_worldFilter) {
    const worldId = await getWorldId(_worldFilter, guild.id)

    if (!worldId) {
      interaction.reply({
        content: `A world named ${_worldFilter} doesn't exist, use the \`/list-worlds\` command to get a valid lis of worlds.`,
        ephemeral: true,
      })

      return
    }
  }

  const onlyMyCoordinates = options.getBoolean(`only-my-coordinates`)

  if (onlyMyCoordinates) {
    const userId = await getCoordinatesUserId(member.id)

    if (!userId) {
      interaction.reply({
        content: `There are no coordinates for your user in **${guild.name}**.`,
        ephemeral: true,
      })

      return
    }
  }

  const userFilter = onlyMyCoordinates == null ? `all` : `<@${member.id}>`,
    _recordsPerPage = options.getInteger(`records-per-page`),
    recordsPerPage = _recordsPerPage ? _recordsPerPage : defaultRecordsPerPage,
    filters = {
      world: _worldFilter,
      userId: onlyMyCoordinates ? member.id : null,
    },
    pages = await getPages(recordsPerPage, groupBy, guild, filters)

  if (pages.length === 0) {
    interaction.reply({
      content: `The are no Minecraft coordinates with this criteria in **${guild.name}**.`,
      ephemeral: true,
    })

    return
  }

  const title = `Minecraft Coordinates (X / Y / Z)`,
    description = `filters: world = ${worldFilter}, user = ${userFilter}`,
    messageContents = await generateListMessage(pages, title, description)

  await interaction.reply(messageContents)

  const message = await interaction.fetchReply()

  createList(
    message.id,
    title,
    description,
    pages,
    recordsPerPage,
    groupBy,
    filters
  )
}
