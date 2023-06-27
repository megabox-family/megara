import { ApplicationCommandOptionType } from 'discord.js'
import { dimensions } from '../utils/slash-commands.js'
import {
  getWorldId,
  getCoordinatesId,
  createCoordinates,
} from '../repositories/coordinates.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to record the coordinates of a location in Minecraft.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `world-name`,
      description: `The name of the world you'd like to create the coordinates in (use \`/list-worlds\` to get a list).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `dimension`,
      description: `Specify if the coordinates you're creating are in the Overworld, Nether, or End.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: dimensions.map(dimension => {
        return { name: dimension, value: dimension }
      }),
    },
    {
      name: `coordinates-name`,
      description: `The name for the coordinates (example: skeleton spawner).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `x`,
      description: `The x coordinate.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    {
      name: `y`,
      description: `The y coordinate.`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    {
      name: `z`,
      description: `The z coordinate.`,
      type: ApplicationCommandOptionType.Integer,
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
    member = interaction.member,
    options = interaction.options,
    worldName = options.getString(`world-name`).toLowerCase(),
    existingWorldId = await getWorldId(worldName, guild.id)

  if (!existingWorldId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `A world named **${worldName}** doesn't exist, use the \`/list-worlds\` command to get a valid list of worlds.`,
    })

    return
  }
  const coordinatesName = options.getString(`coordinates-name`).toLowerCase(),
    characterLimit = 36

  if (coordinatesName.length > characterLimit) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Coordinate names must be under ${characterLimit} characters, please try again (pro tip: hit ctrl-z).`,
    })

    return
  }

  const existingCoordinatesId = await getCoordinatesId(
    coordinatesName,
    existingWorldId,
    member.id
  )

  if (existingCoordinatesId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Coordinates named **${coordinatesName}** already exist for your user in **${worldName}**, one user cannot have multiple coordinates with the same name in the same world. 🤨`,
    })

    return
  }

  const dimension = options.getString(`dimension`),
    x = options.getInteger(`x`),
    y = options.getInteger(`y`),
    z = options.getInteger(`z`)

  await createCoordinates([
    coordinatesName,
    existingWorldId,
    member.id,
    x,
    y,
    z,
    dimension,
  ])

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The **${coordinatesName}** coordinates in **${worldName}** have been created for your user 🧭`,
  })
}
