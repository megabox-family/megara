import { ApplicationCommandOptionType } from 'discord.js'
import { getWorldId, editWorld } from '../repositories/coordinates.js'

export const description = `Allows you to edit a world record in the worlds table for Minecraft.`
export const dmPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to edit 📝`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `new-world-name`,
      description: `A new name for the world you're editing.`,
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
      content: `A world named **${worldName}** doesn't exists in **${guild.name}** 🤔`,
    })

    return
  }

  const newWorldName = options.getString(`new-world-name`).toLowerCase()

  await editWorld(existingWorldId, newWorldName)

  await interaction.editReply({
    content: `The specified world's name has been changed from **${worldName}** to **${newWorldName}** 📝`,
  })
}
