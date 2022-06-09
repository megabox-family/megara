import { getWorldId, deleteWorld } from '../repositories/coordinates.js'

export const description = `Allows you to delete a world record in the worlds table for Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to delete 👹`,
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
      content: `A world named **${worldName}** doesn't exists in **${guild.name}**.`,
      ephemeral: true,
    })

    return
  }

  await deleteWorld(worldName, guild.id)

  interaction.reply({
    content: `The world with name **${worldName}** has been destroyed.`,
    ephemeral: true,
  })
}
