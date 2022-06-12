import { getWorldId } from '../repositories/coordinates.js'
import { setActiveWorld } from '../repositories/guilds.js'

export const description = `Allows you to set the active Minecraft world within your Discord server, distinguished when listed.`
export const defaultPermission = false,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to set as active (insert 'null' to remove).`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    _worldName = options.getString(`world-name`),
    worldName = _worldName === `null` ? null : _worldName.toLowerCase()

  let existingWorldId

  if (worldName) {
    existingWorldId = await getWorldId(worldName, guild.id)

    if (!existingWorldId) {
      interaction.reply({
        content: `A world named **${worldName}** doesn't exists in **${guild.name}** 🤔`,
        ephemeral: true,
      })

      return
    }
  } else {
    existingWorldId = null
  }

  await setActiveWorld(existingWorldId, guild.id)

  if (worldName)
    interaction.reply({
      content: `The **${worldName}** world is now set as the active world for **${guild.name}** 🌍`,
      ephemeral: true,
    })
  else
    interaction.reply({
      content: `There is no longer an active world set in **${guild.name}** 😵`,
      ephemeral: true,
    })
}
