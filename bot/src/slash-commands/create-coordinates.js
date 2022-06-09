import {
  getWorldId,
  getCoordinatesId,
  createCoordinate,
} from '../repositories/coordinates.js'

export const description = `Allows you to record the coordinates of a location in Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to create the coordinates in.`,
      type: `STRING`,
      required: true,
    },
    {
      name: `coordinates-name`,
      description: `The name for the coordinates (example: skeleton spawner).`,
      type: `STRING`,
      required: true,
    },
    {
      name: `x`,
      description: `The x coordinate.`,
      type: `INTEGER`,
      required: true,
    },
    {
      name: `y`,
      description: `The y coordinate.`,
      type: `INTEGER`,
      required: true,
    },
    {
      name: `z`,
      description: `The z coordinate.`,
      type: `INTEGER`,
      required: true,
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
    coordinatesId = getCoordinatesId(coordinatesName, existingWorldId)

  if (coordinatesId) {
    interaction.reply({
      content: `Coordinates named **${coordinatesName}** already exist for your user, one user cannot have multiple coordinates with the same name.`,
      ephemeral: true,
    })

    return
  }

  const x = options.getInteger(`x`),
    y = options.getInteger(`y`),
    z = options.getInteger(`z`)

  createCoordinate([coordinatesName, existingWorldId, member.id, x, y, z])
}
