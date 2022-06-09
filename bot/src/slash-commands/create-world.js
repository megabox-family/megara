import { getWorldId, createWorld } from '../repositories/coordinates.js'

export const description = `Allows you to create a world record in the worlds table for Minecraft.`
export const defaultPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to create 😈`,
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

  if (existingWorldId) {
    interaction.reply({
      content: `A world named **${worldName}** already exists in **${guild.name}**, you cannot create multiple worlds with the same name.`,
      ephemeral: true,
    })

    return
  }

  await createWorld(worldName, member)

  interaction.reply({
    content: `A world with name **${worldName}** has been created.`,
    ephemeral: true,
  })
}
