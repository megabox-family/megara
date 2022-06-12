import { getWorldId, editWorld } from '../repositories/coordinates.js'

export const description = `Allows you to edit a world record in the worlds table for Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to edit 📝`,
      type: `STRING`,
      required: true,
    },
    {
      name: `new-world-name`,
      description: `A new name for the world you're editing.`,
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
      content: `A world named **${worldName}** doesn't exists in **${guild.name}** 🤔`,
      ephemeral: true,
    })

    return
  }

  const newWorldName = options.getString(`new-world-name`).toLowerCase()

  await editWorld(existingWorldId, newWorldName)

  interaction.reply({
    content: `The specified world's name has been changed from **${worldName}** to **${newWorldName}** 📝`,
    ephemeral: true,
  })
}
