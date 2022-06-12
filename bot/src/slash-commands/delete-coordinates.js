import {
  getWorldId,
  getCoordinatesId,
  deleteCoordinates,
} from '../repositories/coordinates.js'

export const description = `Allows you to delete the coordinates of a location in Minecraft if you created them.`
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
    existingCoordinatesId = await getCoordinatesId(
      coordinatesName,
      existingWorldId,
      member.id
    )

  if (!existingCoordinatesId) {
    interaction.reply({
      content: `Coordinates named **${coordinatesName}** in **${worldName}** don't exist for your user. 🤔`,
      ephemeral: true,
    })

    return
  }

  await deleteCoordinates(existingCoordinatesId)

  interaction.reply({
    content: `The **${coordinatesName}** coordinates in **${worldName}** have been deleted for your user ⚰️`,
    ephemeral: true,
  })
}
