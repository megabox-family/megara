import { ApplicationCommandOptionType } from 'discord.js'
import {
  getWorldId,
  getCoordinatesId,
  deleteCoordinates,
} from '../repositories/coordinates.js'

export const description = `Allows you to delete the coordinates of a location in Minecraft if you created them.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `coordinates-name`,
      description: `The name for the coordinates (example: skeleton spawner).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `world-name`,
      description: `The name of the world you'd like to create the coordinates in.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    options = interaction.options,
    worldName = options.getString(`world-name`).toLowerCase(),
    existingWorldId = await getWorldId(worldName, guild.id)

  if (!existingWorldId) {
    await interaction.editReply({
      content: `A world named **${worldName}** doesn't exist, use the \`/list-worlds\` command to get a valid list of worlds.`,
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
    await interaction.editReply({
      content: `Coordinates named **${coordinatesName}** in **${worldName}** don't exist for your user. 🤔`,
    })

    return
  }

  await deleteCoordinates(existingCoordinatesId)

  await interaction.editReply({
    content: `The **${coordinatesName}** coordinates in **${worldName}** have been deleted for your user ⚰️`,
  })
}
