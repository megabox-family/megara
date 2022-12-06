import { ApplicationCommandOptionType } from 'discord.js'
import { getWorldId, deleteWorld } from '../repositories/coordinates.js'

export const description = `Allows you to delete a world record in the worlds table for Minecraft.`
export const dmPermission = false,
  defaultMemberPermissions = 0,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to delete 👹`,
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

  await deleteWorld(existingWorldId)

  await interaction.editReply({
    content: `The world with name **${worldName}** has been destroyed 💥`,
  })
}
