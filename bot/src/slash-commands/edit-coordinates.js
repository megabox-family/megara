import { indexOf } from 'lodash-es'
import {
  getWorldId,
  getCoordinates,
  editCoordinates,
} from '../repositories/coordinates.js'

export const description = `Allows you to edit the coordinates of a location in Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `coordinates-name`,
      description: `The name for the coordinates you'd like to edit.`,
      type: `STRING`,
      required: true,
    },
    {
      name: `world-name`,
      description: `The name of the world you'd like to edit the coordinates in.`,
      type: `STRING`,
      required: true,
    },
    {
      name: `new-coordinates-name`,
      description: `The new name for the coordinates (example: skeleton spawner).`,
      type: `STRING`,
      required: false,
    },
    {
      name: `new-world-name`,
      description: `The name of the world you'd like to change these coordinates to.`,
      type: `STRING`,
      required: false,
    },
    {
      name: `x`,
      description: `The new x coordinate.`,
      type: `INTEGER`,
      required: false,
    },
    {
      name: `y`,
      description: `The new y coordinate.`,
      type: `INTEGER`,
      required: false,
    },
    {
      name: `z`,
      description: `The new z coordinate.`,
      type: `INTEGER`,
      required: false,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    options = interaction.options,
    worldName = options.getString(`world-name`).toLowerCase(),
    existingWorldId = await getWorldId(worldName, guild.id)

  if (!existingWorldId) {
    interaction.reply({
      content: `A world named **${worldName}** doesn't exist, use the \`/list-worlds\` command to get a valid list of worlds.`,
      ephemeral: true,
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
    interaction.reply({
      content: `Coordinates named **${coordinatesName}** don't exist in **${worldName}** for your user, and this is not the field that you put a coordinates new name in 🤔`,
      ephemeral: true,
    })

    return
  }

  const _newWorldName = options.getString(`new-world-name`),
    newWorldName = _newWorldName ? _newWorldName.toLowerCase() : worldName

  let newExistingWorldId

  if (_newWorldName) {
    newExistingWorldId = await getWorldId(newWorldName, guild.id)

    if (!newExistingWorldId) {
      interaction.reply({
        content: `A world named **${newWorldName}** doesn't exist. Therefore, you can't change a coordinate to it. Use the \`/list-worlds\` command to get a valid list of worlds.`,
        ephemeral: true,
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
    newCoordinates = {
      id: null,
      name: newCoordinatesName,
      worldId: newExistingWorldId,
      x: x,
      y: y,
      z: z,
    },
    allValuesAreNull = Object.keys(newCoordinates).every(
      key => newCoordinates[key] == null
    )

  if (allValuesAreNull) {
    interaction.reply({
      content: `You need to change at least one property of the original coordinates to edit them 🤔`,
      ephemeral: true,
    })

    return
  }

  Object.keys(newCoordinates).forEach(key => {
    if (newCoordinates[key] == null)
      newCoordinates[key] = existingCoordinates[key]
  })

  await editCoordinates(newCoordinates)

  interaction.reply({
    content: `
      The **${existingCoordinates.name}** coordinates in **${newWorldName}** have been edited for your user 📝
      \nOld:\
      \n\`\`\`coordinates-name: ${coordinatesName},\
      \nworld-name: ${worldName},\
      \nx: ${existingCoordinates.x},\
      \ny: ${existingCoordinates.y},\
      \nz: ${existingCoordinates.z},\
      \n\`\`\`\
      \nNew:\
      \n\`\`\`coordinates-name: ${newCoordinates.name},\
      \nworld-name: ${newWorldName},\
      \nx: ${newCoordinates.x},\
      \ny: ${newCoordinates.y},\
      \nz: ${newCoordinates.z},\
      \n\`\`\`\
    `,
    ephemeral: true,
  })
}
