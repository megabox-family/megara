import { ApplicationCommandOptionType } from 'discord.js'
import { getWorldId } from '../repositories/coordinates.js'
import { setActiveWorld } from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to set the active Minecraft world within your Discord server, distinguished when listed.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to set as active (insert 'null' to remove).`,
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
    _worldName = options.getString(`world-name`),
    worldName = _worldName === `null` ? null : _worldName.toLowerCase()

  let existingWorldId

  if (worldName) {
    existingWorldId = await getWorldId(worldName, guild.id)

    if (!existingWorldId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `A world named **${worldName}** doesn't exists in **${guild.name}** 🤔`,
      })

      return
    }
  } else {
    existingWorldId = null
  }

  await setActiveWorld(existingWorldId, guild.id)

  if (worldName)
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The **${worldName}** world is now set as the active world for **${guild.name}** 🌍`,
    })
  else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There is no longer an active world set in **${guild.name}** 😵`,
    })
}
