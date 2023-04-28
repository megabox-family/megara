import { ApplicationCommandOptionType } from 'discord.js'
import { getWorldId, editWorld } from '../repositories/coordinates.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to edit a world record in the worlds table for Minecraft.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to edit 📝`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `new-world-name`,
      description: `A new name for the world you're editing. 🌍`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    options = interaction.options,
    worldName = options.getString(`world-name`).toLowerCase(),
    existingWorldId = await getWorldId(worldName, guild.id)

  if (!existingWorldId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `A world named **${worldName}** doesn't exists in **${guild.name}** 🤔`,
    })

    return
  }

  const newWorldName = options.getString(`new-world-name`).toLowerCase()

  await editWorld(existingWorldId, newWorldName)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The specified world's name has been changed from **${worldName}** to **${newWorldName}** 📝`,
  })
}
