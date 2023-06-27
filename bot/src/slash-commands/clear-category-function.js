import { ApplicationCommandOptionType } from 'discord.js'
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

export const description = `Removes the custom function from the category it's assigned to.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `voice-function`,
      description: `The voice function you want to clear.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `active voice category`, value: `active` },
        { name: `inactive voice category`, value: `inactive` },
      ],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    { channels } = guild,
    categoryFunction = options.getString(`voice-function`),
    relevantCategoryId =
      categoryFunction === `active`
        ? await getActiveVoiceCategoryId(guild.id)
        : await getInactiveVoiceCategoryId(guild.id),
    relevantCategory = channels.cache.get(relevantCategoryId)

  if (!relevantCategoryId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `No category is currently set as the ${categoryFunction} voice category 🤔`,
    })

    return
  }

  if (!relevantCategory) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The category previously set as the ${categoryFunction} voice category no longer exists, but I cleared the association on my end 💾`,
    })
  } else {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `**${relevantCategory.name}** has been removed as the ${categoryFunction} voice category 🫡`,
    })
  }

  await setCommands[categoryFunction](guild.id, null)
}
