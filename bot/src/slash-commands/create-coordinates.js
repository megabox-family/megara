import {
  getWorldId,
  getCoordinatesId,
  createCoordinates,
} from '../repositories/coordinates.js'

export const description = `Allows you to record the coordinates of a location in Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `coordinates-name`,
      description: `The name for the coordinates (example: skeleton spawner).`,
      type: `STRING`,
      required: true,
    },
    {
      name: `world-name`,
      description: `The name of the world you'd like to create the coordinates in.`,
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
  const coordinatesName = options.getString(`coordinates-name`).toLowerCase()

  if (coordinatesName.length > 40) {
    interaction.reply({
      content: `Coordinate names must be under 40 characters, please try again (pro tip: hit ctrl-z).`,
      ephemeral: true,
    })

    return
  }

  const existingCoordinatesId = await getCoordinatesId(
    coordinatesName,
    existingWorldId,
    member.id
  )

  if (existingCoordinatesId) {
    interaction.reply({
      content: `Coordinates named **${coordinatesName}** already exist for your user in **${worldName}**, one user cannot have multiple coordinates with the same name in the same world. 🤨`,
      ephemeral: true,
    })

    return
  }

  const x = options.getInteger(`x`),
    y = options.getInteger(`y`),
    z = options.getInteger(`z`)

  await createCoordinates([
    coordinatesName,
    existingWorldId,
    member.id,
    x,
    y,
    z,
  ])

  interaction.reply({
    content: `The **${coordinatesName}** coordinates in **${worldName}** have been created for your user 🧭`,
    ephemeral: true,
  })
}
