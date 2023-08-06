import { ApplicationCommandOptionType } from 'discord.js'
import {
  dimensions,
  defaultRecordsPerPage,
  getPages,
  generateListMessage,
} from '../utils/slash-commands.js'
import {
  getWorldId,
  getCoordinatesUserId,
} from '../repositories/coordinates.js'
import { createList } from '../repositories/lists.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Shows you all the Minecraft coordinates within various groups.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `group-by`,
      description: `What you'd like to group the cooridinates by.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `world`, value: `world` },
        { name: `dimension`, value: `dimension` },
        { name: `user`, value: `user` },
        { name: `all coordinates`, value: `all` },
      ],
    },
    {
      name: `world-filter`,
      description: `Only show cooridinates for the specified world (enter world name here).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `dimension-filter`,
      description: `Only show cooridinates for the specified dimension within the world.`,
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: dimensions.map(dimension => {
        return { name: dimension, value: dimension }
      }),
    },
    {
      name: `only-my-coordinates`,
      description: `If true only coordinates you've entered will be listed, if false all user's cooridinates will list.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `records-per-page`,
      description: `The total number of values you'd like to show per page (default is ${defaultRecordsPerPage}).`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 25,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    member = interaction.member,
    options = interaction.options,
    _groupBy = options.getString(`group-by`),
    groupBy = `coordinates-${_groupBy}`,
    _worldFilter = options.getString(`world-filter`),
    worldFilter = _worldFilter ? _worldFilter : `all`

  if (_worldFilter) {
    const worldId = await getWorldId(_worldFilter, guild.id)

    if (!worldId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `A world named ${_worldFilter} doesn't exist, use the \`/list-worlds\` command to get a valid lis of worlds.`,
      })

      return
    }
  }

  const onlyMyCoordinates = options.getBoolean(`only-my-coordinates`)

  if (onlyMyCoordinates) {
    const userId = await getCoordinatesUserId(member.id)

    if (!userId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `There are no coordinates for your user in **${guild.name}**.`,
      })

      return
    }
  }

  const _dimensionFilter = options.getString(`dimension-filter`),
    dimensionFilter = _dimensionFilter == null ? `all` : _dimensionFilter,
    userFilter = onlyMyCoordinates == null ? `all` : `<@${member.id}>`,
    _recordsPerPage = options.getInteger(`records-per-page`),
    recordsPerPage = _recordsPerPage ? _recordsPerPage : defaultRecordsPerPage,
    filters = {
      world: _worldFilter,
      userId: onlyMyCoordinates ? member.id : null,
      dimension: _dimensionFilter,
    },
    pages = await getPages({ recordsPerPage, groupBy, guild, filters })

  if (!pages || !pages.length) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The are no Minecraft coordinates with this criteria in **${guild.name}** 🤔`,
    })

    return
  }

  const title = `Minecraft Coordinates (X / Y / Z)`,
    description = `group by: ${_groupBy} \nkey: 🟢 = overworld, 🔴 = nether, 🟣 = end \nfilters: world = ${worldFilter}, dimension = ${dimensionFilter}, user = ${userFilter}`,
    messageContents = await generateListMessage({ pages, title, description })

  const message = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageContents,
  })

  createList({
    id: message.id,
    title,
    description,
    pages,
    recordsPerPage,
    groupBy,
    filters,
  })
}
