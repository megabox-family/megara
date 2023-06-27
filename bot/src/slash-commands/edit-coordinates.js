import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { dimensions } from '../utils/slash-commands.js'
import {
  getWorldId,
  getCoordinates,
  editCoordinates,
} from '../repositories/coordinates.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to edit the coordinates of a location in Minecraft.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to edit the coordinates in.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `coordinates-name`,
      description: `The name for the coordinates you'd like to edit.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `new-world-name`,
      description: `The name of the world you'd like to change these coordinates to.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `dimension`,
      description: `The dimension you'd like to change these coordinates to.`,
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: dimensions.map(dimension => {
        return { name: dimension, value: dimension }
      }),
    },
    {
      name: `new-coordinates-name`,
      description: `The new name for the coordinates (example: skeleton spawner).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `x`,
      description: `The new x coordinate.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: `y`,
      description: `The new y coordinate.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: `z`,
      description: `The new z coordinate.`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
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
    worldName = options.getString(`world-name`).toLowerCase(),
    existingWorldId = await getWorldId(worldName, guild.id)

  if (!existingWorldId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `A world named **${worldName}** doesn't exist, use the \`/list-worlds\` command to get a valid list of worlds.`,
    })

    return
  }
  const coordinatesName = options.getString(`coordinates-name`).toLowerCase(),
    existingCoordinates = await getCoordinates(
      coordinatesName,
      existingWorldId,
      member.id
    )

  if (!existingCoordinates?.id) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Coordinates named **${coordinatesName}** don't exist in **${worldName}** for your user, and this is not the field that you put a coordinates new name in 🤔`,
    })

    return
  }

  const _newWorldName = options.getString(`new-world-name`),
    newWorldName = _newWorldName ? _newWorldName.toLowerCase() : worldName

  let newExistingWorldId

  if (_newWorldName) {
    newExistingWorldId = await getWorldId(newWorldName, guild.id)

    if (!newExistingWorldId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `A world named **${newWorldName}** doesn't exist. Therefore, you can't change a coordinate to it. Use the \`/list-worlds\` command to get a valid list of worlds.`,
      })

      return
    }
  }

  const _newCoordinatesName = options.getString(`new-coordinates-name`),
    newCoordinatesName = _newCoordinatesName
      ? _newCoordinatesName.toLowerCase()
      : null,
    x = options.getInteger(`x`),
    y = options.getInteger(`y`),
    z = options.getInteger(`z`),
    dimension = options.getString(`dimension`),
    newCoordinates = {
      id: null,
      name: newCoordinatesName,
      worldId: newExistingWorldId,
      x: x,
      y: y,
      z: z,
      dimension: dimension,
    },
    allValuesAreNull = Object.keys(newCoordinates).every(
      key => newCoordinates[key] == null
    )

  if (allValuesAreNull) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You need to change at least one property of the original coordinates to edit them 🤔`,
    })

    return
  }

  Object.keys(newCoordinates).forEach(key => {
    if (newCoordinates[key] == null)
      newCoordinates[key] = existingCoordinates[key]
  })

  await editCoordinates(newCoordinates)

  const embed = new EmbedBuilder()
    .setColor(`#0099ff`)
    .setTitle(`edit coordinates 📝`)
    .addFields(
      {
        name: `old coordinates data`,
        value:
          `world-name: ${worldName}` +
          `\ndimension: ${existingCoordinates.dimension}` +
          `\ncoordinates-name: ${existingCoordinates.name}` +
          `\nx: ${existingCoordinates.x}` +
          `\ny: ${existingCoordinates.y}` +
          `\nz: ${existingCoordinates.z}`,
      },
      {
        name: `new coordinates data`,
        value:
          `world-name: ${newWorldName}` +
          `\ndimension: ${newCoordinates.dimension}` +
          `\ncoordinates-name: ${newCoordinates.name}` +
          `\nx: ${newCoordinates.x}` +
          `\ny: ${newCoordinates.y}` +
          `\nz: ${newCoordinates.z}`,
      }
    )
    .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { embeds: [embed] },
  })
}
