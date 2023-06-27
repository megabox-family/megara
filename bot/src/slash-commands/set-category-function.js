import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
  setActiveVoiceCategoryId,
  setInactiveVoiceCategoryId,
} from '../repositories/guilds.js'

const setCommands = {
  active: setActiveVoiceCategoryId,
  inactive: setInactiveVoiceCategoryId,
}

export const description = `Sets the specified category's custom function.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `voice-function`,
      description: `The function you want to assign to the specified category.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `active voice category`, value: `active` },
        { name: `inactive voice category`, value: `inactive` },
      ],
    },
    {
      name: `category`,
      description: `The category you want to give the function to.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [ChannelType.GuildCategory],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    categoryFunction = options.getString(`voice-function`),
    category = options.getChannel(`category`),
    { id: categoryId, name: categoryName } = category,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
    inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id)

  if (categoryFunction === `active`) {
    if (categoryId === activeVoiceCategoryId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `**${categoryName}** is already the active voice category 🤔`,
      })

      return
    } else if (categoryId === inactiveVoiceCategoryId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `**${categoryName}** is currently set as the inactive voice category and can only have one voice function 🤔`,
      })

      return
    }
  } else if (categoryFunction === `inactive`) {
    if (categoryId === activeVoiceCategoryId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `**${categoryName}** is currently set as the active voice category and can only have one voice function 🤔`,
      })

      return
    } else if (categoryId === inactiveVoiceCategoryId) {
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `**${categoryName}** is already the inactive voice category  🤔`,
      })

      return
    }
  }

  await setCommands[categoryFunction](guild.id, categoryId)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `**${categoryName}** has been set as the ${categoryFunction} voice category 🙌`,
  })
}
